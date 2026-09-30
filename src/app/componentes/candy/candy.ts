import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CandyService } from '../../core/services/candy.service';
import { ReservaService } from '../../core/services/reserva.service';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { FuncionesService } from '../../core/services/funciones.service';
import { Ticket } from '../../core/services/ticket.service';
import { LoadingService } from '../../core/services/loading.service';
import { SalaEnVivoService } from '../../core/services/sala-en-vivo.service';
import { Auth } from '../../core/services/auth.service';
import { IProductoCandy } from '../../core/interfaces/Candy';
import { Venta } from '../../core/interfaces/Venta';
import { Butaca } from '../../core/interfaces/Butaca';
import { Supabase } from '../../core/services/supabase.service';

@Component({
  selector: 'app-candy',
  standalone: true,
  templateUrl: './candy.html',
  styleUrl: './candy.css'
})
export class Candy implements OnInit, OnDestroy {
  private candyService = inject(CandyService);
  public reservaService = inject(ReservaService);
  private sesionCompra = inject(SesionCompraService);
  private funcionesService = inject(FuncionesService);
  private ticketService = inject(Ticket);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private salaEnVivo = inject(SalaEnVivoService);
  public authService = inject(Auth);
  private supabaseS = inject(Supabase); 

  productosDisponibles = signal<IProductoCandy[]>([]);
  combosDisponibles = signal<any[]>([]);
  combosAplicados = signal<any[]>([]);
  
  saldoPuntos = signal<number>(0);
  entradasGratisAplicadas = signal<number>(0);
  costoPuntosPorEntrada = 5000; 

  totalEntradas = computed(() => {
    const cantidadTotal = this.reservaService.butacasSeleccionadas().length;
    const butacasRegulares = Math.max(0, cantidadTotal - this.entradasGratisAplicadas() - this.combosAplicados().length); 
    
    const precioBruto = butacasRegulares * this.sesionCompra.precioBaseEntrada;
    const descuento = this.sesionCompra.descuentoAplicado();
    return precioBruto - (precioBruto * (descuento / 100));
  });

  granTotal = computed(() => {
    const totalCombos = this.combosAplicados().reduce((acc, combo) => acc + combo.precio, 0);
    return this.totalEntradas() + this.reservaService.totalCandy() + totalCombos;
  });

  async ngOnInit() {
    if (this.reservaService.butacasSeleccionadas().length === 0) {
      this.router.navigate(['/cartelera']);
      return;
    }

    this.loadingService.mostrar();
    try {
      this.productosDisponibles.set(await this.candyService.obtenerProductos());
      await this.cargarSaldoPuntos(); 
      await this.cargarCombos();
    } catch (error) {
      console.error('Error al cargar datos en Candy Bar', error);
    } finally {
      this.loadingService.ocultar();
    }
  }

  ngOnDestroy() {
    this.salaEnVivo.desconectar();
  }

  private async cargarCombos() {
    const { data } = await this.supabaseS.Supabase
        .from('combos')
        .select('*')
        .eq('activo', true)
        .order('destacado', { ascending: false });
    
    if (data) this.combosDisponibles.set(data);
  }

  agregarCombo(combo: any) {
    const cantidadButacas = this.reservaService.butacasSeleccionadas().length;
    const entradasOcupadas = this.entradasGratisAplicadas() + this.combosAplicados().length;

    if (entradasOcupadas >= cantidadButacas) {
      alert('Ya aplicaste promociones o combos a todas tus butacas.');
      return;
    }
    
    this.combosAplicados.update(combos => [...combos, combo]);
  }

  private async cargarSaldoPuntos() {
    const usuarioId = this.authService.usuarioActual()?.id;
    if (!usuarioId) return;

    const { data } = await this.supabaseS.Supabase
      .from('Puntos_Movimientos')
      .select('puntos')
      .eq('usuario_id', usuarioId);
    
    const total = data?.reduce((acc, mov) => acc + mov.puntos, 0) || 0;
    this.saldoPuntos.set(total);
  }

  aplicarEntradaGratis() {
    const cantidadButacas = this.reservaService.butacasSeleccionadas().length;
    
    if (this.entradasGratisAplicadas() >= cantidadButacas) {
      alert('Ya canjeaste entradas gratis para todas tus butacas.');
      return;
    }

    if (this.saldoPuntos() >= this.costoPuntosPorEntrada) {
      this.entradasGratisAplicadas.update(v => v + 1);
      this.saldoPuntos.update(v => v - this.costoPuntosPorEntrada);
    } else {
      alert('No tenés suficientes puntos para canjear otra entrada.');
    }
  }

  agregar(producto: IProductoCandy) {
    this.reservaService.agregarAlCarrito(producto);
  }

  async confirmarCompraFinal() {
    const idFunc = this.reservaService.idFuncionSeleccionada();
    const butacas = this.reservaService.butacasSeleccionadas();

    if (!idFunc || butacas.length === 0) {
      alert('Error: No hay una reserva activa.');
      return;
    }

    this.loadingService.mostrar();
    try {
      const ventas = await this.funcionesService.registrarVentas(this.construirVentas(idFunc, butacas));
      const ticketPrincipal = ventas[0];

      await this.registrarCandy(ticketPrincipal.id);
      await this.marcarCuponSiCorresponde();
      await this.descontarPuntosCanjeados();

      await this.generarComprobante(butacas, ticketPrincipal.id, ticketPrincipal.codigo_manual);

      alert('¡Compra exitosa! Se descargará tu comprobante.');

      this.limpiarReserva();
      this.router.navigate(['/cartelera']);
    } catch (error: any) {
      console.error('Error procesando la compra final:', error);
      if (error?.message === 'BUTACA_YA_VENDIDA') {
        alert('Alguna de tus butacas acaba de ser comprada por otra persona. Volvé a elegir tus asientos.');
        this.reservaService.butacasSeleccionadas.set([]);
        this.router.navigate(['/comprar', idFunc]);
        return;
      }
      alert('Hubo un error al procesar tu compra. Revisa la consola.');
    } finally {
      this.loadingService.ocultar();
    }
  }

  private construirVentas(idFuncion: string, butacas: Butaca[]): Venta[] {
    const usuarioId = this.authService.usuarioActual()?.id ?? null;
    const email = this.sesionCompra.emailComprador();
    
    const precioBase = this.sesionCompra.precioBaseEntrada;
    const descuento = this.sesionCompra.descuentoAplicado();
    const precioUnitario = precioBase - (precioBase * (descuento / 100));

    return butacas.map((butaca, index) => {
      const esGratis = index < this.entradasGratisAplicadas(); 
      
      return {
        funcion_id: idFuncion,
        usuario_id: usuarioId,
        email_comprador: email,
        monto_total: esGratis ? 0 : precioUnitario,
        butaca_id: butaca.id,
        codigo_manual: this.generarCodigoManual()
      };
    });
  }

  private async descontarPuntosCanjeados() {
    const cantidadCanjes = this.entradasGratisAplicadas();
    if (cantidadCanjes === 0) return;

    const usuarioId = this.authService.usuarioActual()?.id;
    if (!usuarioId) return;

    const puntosARestar = cantidadCanjes * this.costoPuntosPorEntrada;
    
    const { error } = await this.supabaseS.Supabase.from('Puntos_Movimientos').insert({
      usuario_id: usuarioId,
      puntos: -puntosARestar,
      motivo: 'canje_entrada_checkout'
    });

    if (error) {
      console.error('Error al descontar puntos:', error);
      throw new Error('No se pudieron descontar los puntos de la base de datos.');
    }
  }

  private async registrarCandy(idTicket: string) {
    const carrito = this.reservaService.carritoCandy();
    if (carrito.length === 0) return;

    const items = carrito.map(item => ({
      id_ticket: idTicket,
      id_producto: item.producto.id,
      cantidad: item.cantidad,
      precio_unitario: item.producto.precio
    }));

    await this.candyService.registrarVentaCandy(items);
  }

  private async marcarCuponSiCorresponde() {
    const datosUsuario = this.sesionCompra.datosUsuario();
    if (!this.sesionCompra.esAnonimo() && datosUsuario?.uso_cupon === false) {
      await this.sesionCompra.marcarCuponUsado(datosUsuario.id);
    }
  }

  private async generarComprobante(butacas: Butaca[], idTicket: string, codigoManual: string) {
    const detalles = this.reservaService.detalleFuncion();

    await this.ticketService.generarTicketsPDF(
      detalles?.pelicula || 'Pelicula',
      detalles?.horario || new Date().toLocaleString(),
      detalles?.sala || 'Sala a confirmar',
      butacas.map(b => b.id),
      this.granTotal(),
      idTicket,
      codigoManual
    );
  }

  private limpiarReserva() {
    this.reservaService.peliculaSeleccionada.set(null);
    this.reservaService.butacasSeleccionadas.set([]);
    this.reservaService.idFuncionSeleccionada.set(null);
    this.reservaService.carritoCandy.set([]);
  }

  private generarCodigoManual(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => caracteres.charAt(Math.floor(Math.random() * caracteres.length))).join('');
  }
}