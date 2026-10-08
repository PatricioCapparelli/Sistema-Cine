import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CandyService } from '../../core/services/candy.service';
import { CombosService } from '../../core/services/combos.service';
import { CreditoService } from '../../core/services/credito.service';
import { FidelizacionService } from '../../core/services/fidelizacion.service';
import { FuncionesService } from '../../core/services/funciones.service';
import { LoadingService } from '../../core/services/loading.service';
import { PreciosService } from '../../core/services/precio.service';
import { ReservaService } from '../../core/services/reserva.service';
import { SalaEnVivoService } from '../../core/services/sala-en-vivo.service';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { Ticket } from '../../core/services/ticket.service';
import { Auth } from '../../core/services/auth.service';
import { IProductoCandy } from '../../core/interfaces/Candy';
import { ICombo } from '../../core/interfaces/Combo';
import { Venta } from '../../core/interfaces/Venta';
import { Butaca } from '../../core/interfaces/Butaca';
import { AlertaService } from '../../core/services/alerta.service';

interface TicketCreado {
  id: string;
  codigo_manual: string;
}

interface LineaEntrada {
  butaca: Butaca;
  combo: ICombo | null;
  canje: boolean;
  entrada: number;
  monto: number;
}

@Component({
  selector: 'app-candy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './candy.html',
  styleUrl: './candy.css'
})
export class Candy implements OnInit, OnDestroy {
  private candyService = inject(CandyService);
  private combosService = inject(CombosService);
  private creditoService = inject(CreditoService);
  private fidelizacion = inject(FidelizacionService);
  private funcionesService = inject(FuncionesService);
  private ticketService = inject(Ticket);
  private loadingService = inject(LoadingService);
  private salaEnVivo = inject(SalaEnVivoService);
  private sesionCompra = inject(SesionCompraService);
  private router = inject(Router);
  private precioService = inject(PreciosService);
  public reservaService = inject(ReservaService);
  public authService = inject(Auth);

  private alerta = inject(AlertaService);
  private saldoReal = signal(0);

  comprando = signal(false);
  productosDisponibles = signal<IProductoCandy[]>([]);
  combosDisponibles = signal<ICombo[]>([]);
  combosAplicados = signal<ICombo[]>([]);
  entradasGratisAplicadas = signal(0);
  costoPuntosPorEntrada = signal(0);
  usarCredito = signal(false);
  creditoDisponible = this.creditoService.saldo;
  recargoVip = this.precioService.recargoVip;

  private precioEntrada = computed(() =>
    this.reservaService.detalleFuncion()?.precioEntrada ?? this.precioService.precioBase()
  );

  private cantidadButacas = computed(() => this.reservaService.butacasSeleccionadas().length);
  private entradasConPromo = computed(() => this.entradasGratisAplicadas() + this.combosAplicados().length);

  butacasVip = computed(() => this.reservaService.butacasSeleccionadas().filter(b => b.tipo === 'vip'));
  cantidadVip = computed(() => this.butacasVip().length);
  idsVip = computed(() => this.butacasVip().map(b => b.id).join(', '));
  precioVip = computed(() => this.precioEntrada() + this.recargoVip());

  hayPromoDisponible = computed(() => this.entradasConPromo() < this.cantidadButacas());

  private lineas = computed<LineaEntrada[]>(() => {
    const butacas = this.reservaService.butacasSeleccionadas();
    const recargo = this.recargoVip();
    const descuento = this.sesionCompra.descuentoAplicado();
    const precioBase = this.precioEntrada();

    const orden = butacas
      .map((butaca, indice) => ({ butaca, indice }))
      .sort((a, b) => Number(a.butaca.tipo === 'vip') - Number(b.butaca.tipo === 'vip') || a.indice - b.indice);

    let canjesPendientes = this.entradasGratisAplicadas();
    const combosPendientes = [...this.combosAplicados()];
    const lineas = new Array<LineaEntrada>(butacas.length);

    for (const { butaca, indice } of orden) {
      const extra = butaca.tipo === 'vip' ? recargo : 0;
      let combo: ICombo | null = null;
      let canje = false;
      let entrada: number;
      let monto: number;

      if (canjesPendientes > 0) {
        canjesPendientes--;
        canje = true;
        entrada = extra;
        monto = extra;
      } else if (combosPendientes.length > 0) {
        combo = combosPendientes.shift()!;
        entrada = extra;
        monto = combo.precio + extra;
      } else {
        const lista = precioBase + extra;
        entrada = this.redondear(lista - lista * (descuento / 100));
        monto = entrada;
      }

      lineas[indice] = { butaca, combo, canje, entrada, monto };
    }

    return lineas;
  });

  saldoPuntos = computed(() => this.saldoReal() - this.entradasGratisAplicadas() * this.costoPuntosPorEntrada());

  totalEntradas = computed(() => this.redondear(this.lineas().reduce((acc, linea) => acc + linea.entrada, 0)));

  totalCombos = computed(() => this.combosAplicados().reduce((acc, combo) => acc + combo.precio, 0));

  granTotal = computed(() => this.redondear(this.totalEntradas() + this.totalCombos() + this.reservaService.totalCandy()));

  creditoAplicado = computed(() =>
    this.usarCredito() ? this.redondear(Math.min(this.creditoDisponible(), this.granTotal())) : 0
  );

  aPagar = computed(() => Math.max(0, this.redondear(this.granTotal() - this.creditoAplicado())));

  puedeCanjear = computed(() => {
    const costo = this.costoPuntosPorEntrada();
    return costo > 0 && this.saldoPuntos() >= costo && this.hayPromoDisponible();
  });

  async ngOnInit() {
    if (this.cantidadButacas() === 0) {
      this.router.navigate(['/cartelera']);
      return;
    }

    this.loadingService.mostrar();
    try {
      await Promise.all([
        this.precioService.cargar(),
        this.cargarProductos(),
        this.cargarCombos(),
        this.cargarPuntos()
      ]);
    } finally {
      this.loadingService.ocultar();
    }
  }

  ngOnDestroy() {
    this.salaEnVivo.desconectar();
  }

  agregar(producto: IProductoCandy) {
    this.reservaService.agregarAlCarrito(producto);
  }

  agregarCombo(combo: ICombo) {
    if (!this.hayPromoDisponible()) {
      this.alerta.aviso('Ya aplicaste promociones o combos a todas tus butacas.');
      return;
    }
    this.combosAplicados.update(combos => [...combos, combo]);
  }

  quitarCombo(indice: number) {
    this.combosAplicados.update(combos => combos.filter((_, i) => i !== indice));
  }

  aplicarEntradaGratis() {
    if (this.costoPuntosPorEntrada() <= 0) {
      this.alerta.aviso('Por ahora no hay entradas canjeables con puntos.');
      return;
    }

    if (!this.hayPromoDisponible()) {
      this.alerta.aviso('Ya aplicaste promociones o combos a todas tus butacas.');
      return;
    }

    if (this.saldoPuntos() < this.costoPuntosPorEntrada()) {
      this.alerta.aviso('No tenés suficientes puntos para canjear otra entrada.');
      return;
    }

    this.entradasGratisAplicadas.update(v => v + 1);
  }

  quitarEntradaGratis() {
    this.entradasGratisAplicadas.update(v => Math.max(0, v - 1));
  }

  async confirmarCompraFinal() {
    if (this.comprando()) return;

    const idFunc = this.reservaService.idFuncionSeleccionada();
    const butacas = this.reservaService.butacasSeleccionadas();

    if (!idFunc || butacas.length === 0) {
      this.alerta.error('Error: No hay una reserva activa.');
      return;
    }

    if (!this.confirmarButacasVip()) return;

    this.comprando.set(true);
    this.loadingService.mostrar();
    try {
      const ventas = await this.funcionesService.registrarCompra(
        this.construirVentas(idFunc),
        this.entradasGratisAplicadas(),
        this.creditoAplicado()
      );
      this.creditoService.cargarSaldo();

      const fallidos = await this.completarCompra(ventas[0], butacas);
      this.avisarResultado(ventas[0].codigo_manual, fallidos);

      this.limpiarReserva();
      this.router.navigate(['/cartelera']);
    } catch (error: any) {
      await this.manejarErrorCompra(error, idFunc);
    } finally {
      this.comprando.set(false);
      this.loadingService.ocultar();
    }
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private async confirmarButacasVip(): Promise<boolean> {
    const cantidad = this.cantidadVip();
    if (cantidad === 0) return true;

    const etiqueta = cantidad === 1 ? 'butaca VIP' : 'butacas VIP';
    const recargo = cantidad * this.recargoVip();

    return this.alerta.confirmar(`Tu compra incluye ${cantidad} ${etiqueta} (${this.idsVip()}) con un recargo de $${recargo}, que se cobra también si usás combos o canjes de puntos. ¿Querés continuar?`);
  }

  private async cargarProductos() {
    try {
      this.productosDisponibles.set(await this.candyService.obtenerProductos());
    } catch (error) {
      console.error('Error al cargar el Candy Bar', error);
    }
  }

  private async cargarCombos() {
    try {
      this.combosDisponibles.set(await this.combosService.obtener(true));
    } catch (error) {
      console.error('Error al cargar los combos', error);
    }
  }

  private async cargarPuntos() {
    if (!this.authService.usuarioActual()) return;

    try {
      const [saldo, recompensas] = await Promise.all([
        this.fidelizacion.obtenerSaldo(),
        this.fidelizacion.obtenerRecompensas(true)
      ]);

      const costos = recompensas.filter(r => r.tipo === 'entrada').map(r => r.costo_puntos);
      this.saldoReal.set(saldo);
      this.costoPuntosPorEntrada.set(costos.length > 0 ? Math.min(...costos) : 0);
    } catch (error) {
      console.error('Error al cargar los puntos', error);
    }
  }

  private construirVentas(idFuncion: string): Venta[] {
    const usuarioId = this.authService.usuarioActual()?.id ?? null;
    const email = this.sesionCompra.emailComprador();

    return this.lineas().map(linea => ({
      funcion_id: idFuncion,
      usuario_id: usuarioId,
      email_comprador: email,
      monto_total: linea.monto,
      butaca_id: linea.butaca.id,
      codigo_manual: this.generarCodigoManual(),
      combo_id: linea.combo?.id ?? null,
      canje_puntos: linea.canje
    }));
  }

  private async completarCompra(ticket: TicketCreado, butacas: Butaca[]): Promise<string[]> {
    const pasos: [string, () => Promise<void>][] = [
      ['el pedido del candy bar', () => this.registrarCandy(ticket.id)],
      ['el cupón de bienvenida', () => this.marcarCuponSiCorresponde()],
      ['el comprobante', () => this.generarComprobante(butacas, ticket)]
    ];

    const fallidos: string[] = [];

    for (const [nombre, paso] of pasos) {
      try {
        await paso();
      } catch (error) {
        console.error(`Error en ${nombre}:`, error);
        fallidos.push(nombre);
      }
    }

    return fallidos;
  }

  private avisarResultado(codigo: string, fallidos: string[]) {
    if (fallidos.length === 0) {
      this.alerta.exito('¡Compra exitosa! Se descargará tu comprobante.');
      return;
    }

    this.alerta.aviso(`Tu compra se realizó, pero hubo un problema con: ${fallidos.join(', ')}. Tu código manual es ${codigo}; mostralo en el mostrador.`);
  }

  private async manejarErrorCompra(error: any, idFuncion: string) {
    console.error('Error procesando la compra final:', error);

    switch (error?.message) {
      case 'BUTACA_YA_VENDIDA':
        this.alerta.error('Alguna de tus butacas acaba de ser comprada por otra persona. Volvé a elegir tus asientos.');
        this.reservaService.butacasSeleccionadas.set([]);
        this.router.navigate(['/comprar', idFuncion]);
        break;
      case 'PUNTOS_INSUFICIENTES':
        this.alerta.error('Ya no tenés puntos suficientes para las entradas canjeadas. Revisá tu saldo e intentá de nuevo.');
        this.entradasGratisAplicadas.set(0);
        await this.cargarPuntos();
        break;
      case 'CREDITO_INSUFICIENTE':
        this.alerta.error('Tu crédito cambió y ya no alcanza. Revisalo e intentá de nuevo.');
        this.usarCredito.set(false);
        await this.creditoService.cargarSaldo();
        break;
      case 'VENTA_NO_DISPONIBLE':
        this.alerta.error('Las entradas de esta película todavía no están a la venta.');
        this.router.navigate(['/cartelera']);
        break;
      case 'PRECIO_INVALIDO':
        this.alerta.error('Los precios cambiaron mientras comprabas. Volvé a elegir tus butacas.');
        await this.precioService.cargar(true);
        this.reservaService.butacasSeleccionadas.set([]);
        this.router.navigate(['/comprar', idFuncion]);
        break;
      default:
        this.alerta.error('Hubo un error al procesar tu compra. Revisa la consola.');
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
    const datos = this.sesionCompra.datosUsuario();
    if (this.sesionCompra.esAnonimo() || datos?.uso_cupon !== false) return;

    await this.sesionCompra.marcarCuponUsado(datos.id);
    this.authService.perfilActual.update(perfil => perfil ? { ...perfil, uso_cupon: true } : perfil);
  }

  private async generarComprobante(butacas: Butaca[], ticket: TicketCreado) {
    const detalles = this.reservaService.detalleFuncion();

    await this.ticketService.generarTicketsPDF(
      detalles?.pelicula || 'Pelicula',
      detalles?.horario || new Date().toLocaleString(),
      detalles?.sala || 'Sala a confirmar',
      butacas.map(b => b.id),
      this.granTotal(),
      ticket.id,
      ticket.codigo_manual
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