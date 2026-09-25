import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CandyService } from '../../core/services/candy.service';
import { ReservaService } from '../../core/services/reserva.service';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { FuncionesService } from '../../core/services/funciones.service';
import { Ticket } from '../../core/services/ticket.service';
import { LoadingService } from '../../core/services/loading.service';
import { IProductoCandy } from '../../core/interfaces/Candy';
import { Venta } from '../../core/interfaces/Venta';

@Component({
  selector: 'app-candy',
  standalone: true,
  templateUrl: './candy.html',
  styleUrl: './candy.css'
})
export class Candy implements OnInit {
  private candyService = inject(CandyService);
  public reservaService = inject(ReservaService);
  private sesionCompra = inject(SesionCompraService);
  private funcionesService = inject(FuncionesService);
  private ticketService = inject(Ticket);
  private loadingService = inject(LoadingService);
  private router = inject(Router);

  productosDisponibles = signal<IProductoCandy[]>([]);

  totalEntradas = computed(() => {
    const cantidad = this.reservaService.butacasSeleccionadas().length;
    const precioBruto = cantidad * this.sesionCompra.precioBaseEntrada;
    const descuento = this.sesionCompra.descuentoAplicado();
    return precioBruto - (precioBruto * (descuento / 100));
  });

  granTotal = computed(() => {
    return this.totalEntradas() + this.reservaService.totalCandy();
  });

  async ngOnInit() {
    if (this.reservaService.butacasSeleccionadas().length === 0) {
      this.router.navigate(['/cartelera']);
      return;
    }

    this.loadingService.mostrar();
    try {
      const productos = await this.candyService.obtenerProductos();
      this.productosDisponibles.set(productos);
    } catch (error) {
      console.error('Error al cargar el Candy Bar', error);
    } finally {
      this.loadingService.ocultar();
    }
  }

  agregar(producto: IProductoCandy) {
    this.reservaService.agregarAlCarrito(producto);
  }

  async confirmarCompraFinal() {
    const idFunc = this.reservaService.idFuncionSeleccionada();
    const butacas = this.reservaService.butacasSeleccionadas();
    const carrito = this.reservaService.carritoCandy();

    if (!idFunc || butacas.length === 0) {
      alert('Error: No hay una reserva activa.');
      return;
    }

    this.loadingService.mostrar();
    try {
      const datosUsuario = this.sesionCompra.datosUsuario();
      const esAnonimo = this.sesionCompra.esAnonimo();

      const precioPorButaca = this.totalEntradas() / butacas.length;
      const ticketsAInsertar: Venta[] = butacas.map(butaca => ({
        funcion_id: idFunc,
        usuario_id: !esAnonimo && datosUsuario ? datosUsuario.id : null,
        email_comprador: this.sesionCompra.emailComprador(),
        monto_total: precioPorButaca,
        butaca_id: butaca.id,
        codigo_manual: this.generarCodigoManual()
      }));

      const ventasGeneradas = await this.funcionesService.registrarVentas(ticketsAInsertar);

      const idTicketPrincipal = ventasGeneradas[0].id;
      const codigoManualPrincipal = ventasGeneradas[0].codigo_manual;

      if (carrito.length > 0 && ventasGeneradas && ventasGeneradas.length > 0) {
        const itemsCandyAInsertar = carrito.map(item => ({
          id_ticket: idTicketPrincipal,
          id_producto: item.producto.id,
          cantidad: item.cantidad,
          precio_unitario: item.producto.precio
        }));

        await this.candyService.registrarVentaCandy(itemsCandyAInsertar);
      }

      if (!esAnonimo && datosUsuario?.uso_cupon === false) {
        await this.sesionCompra.marcarCuponUsado(datosUsuario.id);
      }

      const butacasIds = butacas.map(b => b.id);
      const detalles = this.reservaService.detalleFuncion();

      await this.ticketService.generarTicketsPDF(
        detalles?.pelicula || 'Pelicula',
        detalles?.horario || new Date().toLocaleString(),
        detalles?.sala || 'Sala a confirmar',
        butacasIds,
        this.granTotal(),
        idTicketPrincipal,
        codigoManualPrincipal 
      );

      alert(`Compra exitosa! Se descargara tu comprobante.`);

      this.reservaService.peliculaSeleccionada.set(null);
      this.reservaService.butacasSeleccionadas.set([]);
      this.reservaService.idFuncionSeleccionada.set(null);
      this.reservaService.carritoCandy.set([]);

      this.router.navigate(['/cartelera']);

    } catch (error) {
      console.error('Error procesando la compra final:', error);
      alert('Hubo un error al procesar tu compra. Revisa la consola.');
    } finally {
      this.loadingService.ocultar();
    }
  }

  generarCodigoManual(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
  }
}