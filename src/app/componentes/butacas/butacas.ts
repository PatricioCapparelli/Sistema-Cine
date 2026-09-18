import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { FuncionesService } from '../../core/services/funciones.service';
import { Ticket } from '../../core/services/ticket.service';
import { Venta } from '../../core/interfaces/Venta';
import { Butaca } from '../../core/interfaces/Butaca';

@Component({
  selector: 'app-butacas',
  standalone: true,
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit {
  private sesionCompra = inject(SesionCompraService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService); 
  private ticketService = inject(Ticket);
  private compraVenta = inject(SesionCompraService)
  
  matrizSala = signal<Butaca[][]>([]);
  butacasSeleccionadas = signal<Butaca[]>([]);
  idFuncion = signal<string | null>(null);
  
  detalleFuncion = signal<{ pelicula: string, horario: string } | null>(null);
  cantidadSeleccionadas = computed(() => this.butacasSeleccionadas().length);

  totalAPagar = computed(() => {
    const cantidad = this.cantidadSeleccionadas();
    const precioBruto = cantidad * this.sesionCompra.precioBaseEntrada;
    const descuento = this.sesionCompra.descuentoAplicado();

    return precioBruto - (precioBruto * (descuento / 100));
  });

  ngOnInit() {
    this.idFuncion.set(this.route.snapshot.paramMap.get('id'));
    this.generarSala();
    this.cargarDetalleFuncion();
    this.cargarButacasOcupadas();
  }

  private generarSala() {
    const abecedario = 'ABCDEFGHIJKLMNOPQRST';
    const nuevaMatriz: Butaca[][] = [];

    for (let i = 0; i < 20; i++) {
      const letraFila = abecedario[i];
      const butacasFila: Butaca[] = Array.from({ length: 28 }, (_, j) => ({
        id: `${letraFila}-${j + 1}`,
        fila: letraFila,
        numero: j + 1,
        estado: 'libre'
      }));

      nuevaMatriz.push(butacasFila);
    }
    this.matrizSala.set(nuevaMatriz);
  }

  private async cargarDetalleFuncion() {
    const id = this.idFuncion();
    if (!id) return;

    try {
      const data = await this.funcionesService.obtenerDetalleFuncion(id);
      if (data) {
        this.detalleFuncion.set({
          pelicula: (data.Peliculas as any).nombre,
          horario: new Date(data.fecha_hora_inicio).toLocaleString()
        });
      }
    } catch (error) {
      console.error('Error al cargar detalles para el ticket:', error);
    }
  }

  private async cargarButacasOcupadas() {
    const id = this.idFuncion();
    if (!id) return;

    try {
      const data = await this.funcionesService.obtenerButacasOcupadas(id);
      
      if (data.length) {
        const ocupadas = new Set(data.map(t => t.butaca_id));

        this.matrizSala.update(matriz =>
          matriz.map(fila =>
            fila.map(b => ocupadas.has(b.id) ? { ...b, estado: 'ocupada' } : b)
          )
        );
      }
    } catch (error) {
      console.error('Error al cargar butacas ocupadas:', error);
    }
  }

  seleccionarButaca(butaca: Butaca) {
    if (butaca.estado === 'ocupada') return;

    const nuevoEstado = butaca.estado === 'libre' ? 'seleccionada' : 'libre';

    this.matrizSala.update(matriz =>
      matriz.map(fila =>
        fila.map(b => b.id === butaca.id ? { ...b, estado: nuevoEstado } : b)
      )
    );

    if (nuevoEstado === 'seleccionada') {
      this.butacasSeleccionadas.update(actuales => [...actuales, { ...butaca, estado: nuevoEstado }]);
    } else {
      this.butacasSeleccionadas.update(actuales => actuales.filter(b => b.id !== butaca.id));
    }
  }

  async confirmarCompra() {
    const idFunc = this.idFuncion();
    const cantidad = this.cantidadSeleccionadas();

    if (!idFunc) {
      alert('Error crítico: No se identificó la función.');
      return;
    }
    if (cantidad === 0) {
      alert('Debes seleccionar al menos una butaca.');
      return;
    }

    try {
      const datosUsuario = this.sesionCompra.datosUsuario();
      const esAnonimo = this.sesionCompra.esAnonimo();
      const total = this.totalAPagar();
      const precioPorButaca = total / cantidad;

      const ticketsAInsertar: Venta[] = this.butacasSeleccionadas().map(butaca => ({
        funcion_id: idFunc,
        usuario_id: !esAnonimo && datosUsuario ? datosUsuario.id : null,
        email_comprador: this.sesionCompra.emailComprador(),
        monto_total: precioPorButaca,
        butaca_id: butaca.id
      }));

      await this.funcionesService.registrarVentas(ticketsAInsertar);

      if (!esAnonimo && datosUsuario?.uso_cupon === false) {
        try {
          await this.compraVenta.marcarCuponUsado(datosUsuario.id);
        } catch (errorUsuario) {
          console.error('Error al actualizar el cupon', errorUsuario);
        }
      }

      const butacasCompradas = this.butacasSeleccionadas().map(b => b.id);
      const detalles = this.detalleFuncion();
      
      await this.ticketService.generarTicketsPDF(
        detalles?.pelicula || 'Película UTN', 
        detalles?.horario || new Date().toLocaleString(),
        butacasCompradas,
        total
      );

      alert(`¡Compra exitosa! Revisa tus descargas para ver el ticket.`);
      this.router.navigate(['/cartelera']);

    } catch (error) {
      console.error('Error procesando la compra:', error);
      alert('Hubo un error al procesar tu compra. Revisá la consola.');
    }
  }
}