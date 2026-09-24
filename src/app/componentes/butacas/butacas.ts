import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FuncionesService } from '../../core/services/funciones.service';
import { ReservaService } from '../../core/services/reserva.service'; 
import { Butaca } from '../../core/interfaces/Butaca';

@Component({
  selector: 'app-butacas',
  standalone: true,
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService); 
  private reservaService = inject(ReservaService); 
  
  matrizSala = signal<Butaca[][]>([]);
  butacasSeleccionadas = signal<Butaca[]>([]);
  idFuncion = signal<string | null>(null);
  detalleFuncion = signal<{ pelicula: string, horario: string, sala: string } | null>(null);
  
  cantidadSeleccionadas = computed(() => this.butacasSeleccionadas().length);

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
          horario: new Date(data.fecha_hora_inicio).toLocaleString(),
          sala: (data.Salas as any).nombre 
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

  continuarACandy() {
    const idFunc = this.idFuncion();
    const cantidad = this.cantidadSeleccionadas();

    if (!idFunc) {
      alert('Error: No se identifico la funcion.');
      return;
    }
    if (cantidad === 0) {
      alert('Debes seleccionar al menos una butaca para continuar.');
      return;
    }

    this.reservaService.idFuncionSeleccionada.set(idFunc);
    this.reservaService.detalleFuncion.set(this.detalleFuncion());
    this.reservaService.butacasSeleccionadas.set(this.butacasSeleccionadas());

    this.router.navigate(['/candy']);
  }
}