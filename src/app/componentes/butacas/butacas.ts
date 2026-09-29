import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FuncionesService } from '../../core/services/funciones.service';
import { ReservaService } from '../../core/services/reserva.service';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { Auth } from '../../core/services/auth.service';
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
  private sesionCompra = inject(SesionCompraService);
  private authService = inject(Auth);

  private readonly FILAS_LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'ACC', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
  private readonly FILA_ACCESIBLE = 'ACC';
  private readonly SECCIONES_ACCESIBLES = [2, 10, 2];
  private readonly COLUMNAS = 28;

  matrizSala = signal<Butaca[][]>([]);
  butacasSeleccionadas = signal<Butaca[]>([]);
  idFuncion = signal<string | null>(null);
  detalleFuncion = signal<{ pelicula: string; horario: string; sala: string; edadMinima: number; } | null>(null);

  cantidadSeleccionadas = computed(() => this.butacasSeleccionadas().length);

  async ngOnInit() {
    this.idFuncion.set(this.route.snapshot.paramMap.get('id'));

    this.generarSala();
    await this.cargarDetalleFuncion();

    if (!this.validarAcceso()) {
      return;
    }

    await this.cargarButacasOcupadas();
  }

  private validarAcceso(): boolean {

    const detalles = this.detalleFuncion();
    if (!detalles) return false;

    const edadMinima = detalles.edadMinima;

    if (edadMinima <= 0) return true;

    const usuarioDB = this.authService.perfilActual();
    const hayUsuarioRegistrado = !!this.authService.usuarioActual();
    const esAnonimo = !hayUsuarioRegistrado && this.sesionCompra.esAnonimo();

    if (!hayUsuarioRegistrado && !esAnonimo) {
      this.router.navigate(['/auth/login'], { queryParams: { funcionId: this.idFuncion() } });
      return false;
    }

    if (esAnonimo) {
      alert(`Las leyes de restricción de edad exigen que inicies sesión para comprar entradas de una película +${edadMinima}.`);
      this.router.navigate(['/cartelera']);
      return false;
    }

    if (hayUsuarioRegistrado) {
      if (!usuarioDB?.fecha_nacimiento) {
        alert(`Tu perfil no tiene una fecha de nacimiento registrada para validar esta película +${edadMinima}.`);
        this.router.navigate(['/cartelera']);
        return false;
      }

      const edadUsuario = this.calcularEdad(usuarioDB.fecha_nacimiento);
      if (edadUsuario < edadMinima) {
        alert(`Control de seguridad: Esta función requiere ser mayor de ${edadMinima} años.`);
        this.router.navigate(['/cartelera']);
        return false;
      }
    }

    return true;
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

  const nuevaMatriz: Butaca[][] = this.FILAS_LETRAS.map((letra): Butaca[] => {
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
          sala: (data.Salas as any).nombre,
          edadMinima: (data.Peliculas as any).edad_minima || 0
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
      if (!data || data.length === 0) return;

      const ocupadas = new Set(data.map(t => t.butaca_id));

      this.matrizSala.update(matriz =>
        matriz.map(fila =>
          fila.map(b => ocupadas.has(b.id) ? { ...b, estado: 'ocupada' } : b)
        )
      );
    } catch (error) {
      console.error('Error al cargar butacas ocupadas:', error);
    }
  }

  seleccionarButaca(butaca: Butaca) {
    if (butaca.estado === 'ocupada') return;

    const nuevoEstado = butaca.estado === 'libre' ? 'seleccionada' : 'libre';

    this.matrizSala.update(matriz => {
      const nuevaMatriz = [...matriz];
      const indiceFila = matriz.findIndex(f => f[0]?.fila === butaca.fila);

      if (indiceFila !== -1) {
        nuevaMatriz[indiceFila] = nuevaMatriz[indiceFila].map(b =>
          b.id === butaca.id ? { ...b, estado: nuevoEstado } : b
        );
      }
      return nuevaMatriz;
    });

    this.butacasSeleccionadas.update(actuales =>
      nuevoEstado === 'seleccionada'
        ? [...actuales, { ...butaca, estado: nuevoEstado }]
        : actuales.filter(b => b.id !== butaca.id)
    );
  }

  seccionesDe(fila: Butaca[]): Butaca[][] {
  const cortes = fila[0]?.tipo === 'accesible' ? [0, 2, 12, 14] : [0, 4, 24, 28];
  return [0, 1, 2].map(i => fila.slice(cortes[i], cortes[i + 1]));
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

    this.router.navigate(['/candy']);
  }
}