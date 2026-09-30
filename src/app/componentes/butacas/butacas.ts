import { Component, inject, OnInit, OnDestroy, signal, computed, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FuncionesService } from '../../core/services/funciones.service';
import { ReservaService } from '../../core/services/reserva.service';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { Auth } from '../../core/services/auth.service';
import { SalaEnVivoService } from '../../core/services/sala-en-vivo.service';
import { Butaca } from '../../core/interfaces/Butaca';

@Component({
  selector: 'app-butacas',
  standalone: true,
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService);
  private reservaService = inject(ReservaService);
  private sesionCompra = inject(SesionCompraService);
  private authService = inject(Auth);
  private salaEnVivo = inject(SalaEnVivoService);

  private readonly FILAS_LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'ACC', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
  private readonly FILA_ACCESIBLE = 'ACC';
  private readonly SECCIONES_ACCESIBLES = [2, 10, 2];
  private readonly COLUMNAS = 28;

  private canalVentas: RealtimeChannel | null = null;
  private yendoACandy = false;

  matrizSala = signal<Butaca[][]>([]);
  butacasSeleccionadas = signal<Butaca[]>([]);
  idFuncion = signal<string | null>(null);
  detalleFuncion = signal<{ pelicula: string; horario: string; sala: string; edadMinima: number; } | null>(null);

  cantidadSeleccionadas = computed(() => this.butacasSeleccionadas().length);

  constructor() {
    effect(() => {
      const bloqueadas = this.salaEnVivo.bloqueadas();
      untracked(() => this.aplicarBloqueadas(bloqueadas));
    });
  }

  async ngOnInit() {
    this.idFuncion.set(this.route.snapshot.paramMap.get('id'));

    this.generarSala();
    await this.cargarDetalleFuncion();

    if (!this.validarAcceso()) return;

    const id = this.idFuncion();
    if (id) {
      this.canalVentas = this.funcionesService.suscribirseAVentas(id, (butacaId) => this.marcarOcupada(butacaId));
      this.salaEnVivo.conectar(id);
      this.publicarSeleccion();
    }

    await this.cargarButacasOcupadas();
  }

  ngOnDestroy() {
    if (this.canalVentas) this.funcionesService.quitarSuscripcion(this.canalVentas);
    if (!this.yendoACandy) this.salaEnVivo.desconectar();
  }

  seccionesDe(fila: Butaca[]): Butaca[][] {
    const cortes = fila[0]?.tipo === 'accesible' ? [0, 2, 12, 14] : [0, 4, 24, 28];
    return [0, 1, 2].map(i => fila.slice(cortes[i], cortes[i + 1]));
  }

  seleccionarButaca(butaca: Butaca) {
    if (butaca.estado === 'ocupada' || butaca.estado === 'bloqueada') return;

    const nuevoEstado: Butaca['estado'] = butaca.estado === 'libre' ? 'seleccionada' : 'libre';

    this.actualizarEstadoButaca(butaca.id, nuevoEstado);

    this.butacasSeleccionadas.update(actuales =>
      nuevoEstado === 'seleccionada'
        ? [...actuales, { ...butaca, estado: nuevoEstado }]
        : actuales.filter(b => b.id !== butaca.id)
    );

    this.publicarSeleccion();
  }

  continuarACandy() {
    const idFunc = this.idFuncion();

    if (!idFunc) {
      alert('Error: No se identificó la función.');
      return;
    }

    if (this.cantidadSeleccionadas() === 0) {
      alert('Debes seleccionar al menos una butaca para continuar.');
      return;
    }

    this.reservaService.idFuncionSeleccionada.set(idFunc);
    this.reservaService.detalleFuncion.set(this.detalleFuncion());
    this.reservaService.butacasSeleccionadas.set(this.butacasSeleccionadas());

    this.yendoACandy = true;
    this.router.navigate(['/candy']);
  }

  private publicarSeleccion() {
    this.salaEnVivo.publicar(this.butacasSeleccionadas().map(b => b.id));
  }

  private actualizarEstadoButaca(butacaId: string, estado: Butaca['estado']) {
    this.matrizSala.update(matriz =>
      matriz.map(fila => fila.map(b => b.id === butacaId ? { ...b, estado } : b))
    );
  }

  private marcarOcupada(butacaId: string) {
    this.actualizarEstadoButaca(butacaId, 'ocupada');

    if (this.butacasSeleccionadas().some(b => b.id === butacaId)) {
      this.butacasSeleccionadas.update(actuales => actuales.filter(b => b.id !== butacaId));
      alert(`La butaca ${butacaId} acaba de ser comprada por otra persona. Elegí otra.`);
    }

    this.publicarSeleccion();
  }

  private aplicarBloqueadas(bloqueadas: Set<string>) {
    this.matrizSala.update(matriz =>
      matriz.map(fila =>
        fila.map((b): Butaca => {
          if (b.estado === 'ocupada' || b.estado === 'seleccionada') return b;
          return { ...b, estado: bloqueadas.has(b.id) ? 'bloqueada' : 'libre' };
        })
      )
    );
  }

  private validarAcceso(): boolean {
    const detalles = this.detalleFuncion();
    if (!detalles) return false;

    const edadMinima = detalles.edadMinima;
    if (edadMinima <= 0) return true;

    const perfil = this.authService.perfilActual();
    const hayUsuarioRegistrado = !!this.authService.usuarioActual();
    const esAnonimo = !hayUsuarioRegistrado && this.sesionCompra.esAnonimo();

    if (!hayUsuarioRegistrado && !esAnonimo) {
      this.router.navigate(['/auth/login'], { queryParams: { funcionId: this.idFuncion() } });
      return false;
    }

    if (esAnonimo) {
      return this.rechazarAcceso(`Las leyes de restricción de edad exigen que inicies sesión para comprar entradas de una película +${edadMinima}.`);
    }

    if (!perfil?.fecha_nacimiento) {
      return this.rechazarAcceso(`Tu perfil no tiene una fecha de nacimiento registrada para validar esta película +${edadMinima}.`);
    }

    if (this.calcularEdad(perfil.fecha_nacimiento) < edadMinima) {
      return this.rechazarAcceso(`Control de seguridad: Esta función requiere ser mayor de ${edadMinima} años.`);
    }

    return true;
  }

  private rechazarAcceso(mensaje: string): false {
    alert(mensaje);
    this.router.navigate(['/cartelera']);
    return false;
  }

  private calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  private generarSala() {
    const totalAccesibles = this.SECCIONES_ACCESIBLES.reduce((a, b) => a + b, 0);

    const matriz: Butaca[][] = this.FILAS_LETRAS.map((letra): Butaca[] => {
      const esAccesible = letra === this.FILA_ACCESIBLE;
      const cantidad = esAccesible ? totalAccesibles : this.COLUMNAS;

      return Array.from({ length: cantidad }, (_, j) => ({
        id: `${letra}-${j + 1}`,
        fila: letra,
        numero: j + 1,
        estado: 'libre',
        tipo: esAccesible ? 'accesible' : 'normal'
      }));
    });

    this.matrizSala.set(matriz);
  }

  private async cargarDetalleFuncion() {
    const id = this.idFuncion();
    if (!id) return;

    try {
      const data = await this.funcionesService.obtenerDetalleFuncion(id);
      if (!data) return;

      this.detalleFuncion.set({
        pelicula: (data.Peliculas as any).nombre,
        horario: new Date(data.fecha_hora_inicio).toLocaleString(),
        sala: (data.Salas as any).nombre,
        edadMinima: (data.Peliculas as any).edad_minima || 0
      });
    } catch (error) {
      console.error('Error al cargar detalles para el ticket:', error);
    }
  }

  private async cargarButacasOcupadas() {
    const id = this.idFuncion();
    if (!id) return;

    try {
      const data = await this.funcionesService.obtenerButacasOcupadas(id);
      const ocupadas = new Set(data.map(t => t.butaca_id));
      if (ocupadas.size === 0) return;

      this.matrizSala.update(matriz =>
        matriz.map(fila => fila.map(b => ocupadas.has(b.id) ? { ...b, estado: 'ocupada' } : b))
      );
    } catch (error) {
      console.error('Error al cargar butacas ocupadas:', error);
    }
  }
}