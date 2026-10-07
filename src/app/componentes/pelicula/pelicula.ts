import { Component, input, output, OnInit, inject, signal, computed } from '@angular/core';
import { IPelicula } from '../../core/interfaces/Pelicula';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoDuracionPipe } from '../../core/pipes/formato-duracion-pipe';
import { FormsModule } from '@angular/forms';
import { ResenasService } from '../../core/services/resenas.service';
import { Auth } from '../../core/services/auth.service';
import { ReservaService } from '../../core/services/reserva.service';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { estadoVenta, inicioPreventa } from '../../core/utils/venta-pelicula/venta-pelicula';
import { FuncionesService } from '../../core/services/funciones.service';

@Component({
  selector: 'app-pelicula',
  standalone: true,
  imports: [DatePipe, FormatoDuracionPipe, FormsModule],
  styleUrl: './pelicula.css',
  templateUrl: './pelicula.html',
})
export class Pelicula implements OnInit {
  peliculaInput = input<IPelicula>();
  funcionesInput = input<any[]>([]);
  modoAdmin = input<boolean>(false);
  eliminarOutput = output<number>();

  private resenasService = inject(ResenasService);
  public authService = inject(Auth);
  private sesionCompra = inject(SesionCompraService);
  private reservaService = inject(ReservaService);
  private router = inject(Router);

  modalAbierto = signal<boolean>(false);
  listaResenas = signal<any[]>([]);
  promedioEstrellas = signal<string>('0.0');
  nuevaCalificacion = signal<number>(5);
  nuevoComentario = signal<string>('');

  descripcionEdad = computed(() =>
    this.edadMinima() > 0
      ? `Apta para mayores de ${this.edadMinima()} años`
      : 'Apta para todo público'
  );
  edadMinima = computed(() => this.peliculaInput()?.edad_minima ?? 0);
  etiquetaEdad = computed(() => (this.edadMinima() > 0 ? `+${this.edadMinima()}` : 'ATP'));
  estado = computed(() => estadoVenta(this.peliculaInput() ?? {}));
  fechaInicioPreventa = computed(() => inicioPreventa(this.peliculaInput() ?? {}));
  formatos = computed(() => {
    const vistos = new Set<string>();

    for (const funcion of this.funcionesInput()) {
      if (funcion.formatoVisual && funcion.formatoAudio) {
        vistos.add(`${funcion.formatoVisual}|${funcion.formatoAudio}`);
      }
    }

    return [...vistos].map(clave => {
      const [visual, audio] = clave.split('|');
      return { visual, audio };
    });
  });

  async ngOnInit() {
    await this.cargarResenas();
  }

  async cargarResenas() {
    const peli = this.peliculaInput();
    if (peli && peli.id) {
      try {
        const data = await this.resenasService.obtenerResenasYPromedio(peli.id);
        this.listaResenas.set(data.resenas);
        this.promedioEstrellas.set(data.promedio);
      } catch (error) {
        console.error('Error al cargar reseñas:', error);
      }
    }
  }

  async publicarResena() {
    const peli = this.peliculaInput();
    const comentario = this.nuevoComentario().trim();

    if (!comentario) {
      alert('Por favor, escribí un comentario antes de enviar.');
      return;
    }

    const usuario = this.authService.usuarioActual();

    if (!usuario) {
      alert('Error: Tenés que iniciar sesión para dejar una reseña.');
      return;
    }

    if (peli && peli.id) {
      try {
        await this.resenasService.dejarResena(
          peli.id,
          usuario.id,
          this.nuevaCalificacion(),
          comentario
        );

        this.nuevoComentario.set('');
        this.nuevaCalificacion.set(5);
        await this.cargarResenas();

      } catch (error) {
        console.error('Error guardando la reseña:', error);
        alert('Hubo un problema al guardar tu reseña.');
      }
    }
  }

  abrirModal() {
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  onEliminar() {
    const peli = this.peliculaInput();
    if (peli && peli.id) {
      this.eliminarOutput.emit(peli.id);
    }
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  iniciarCompra(funcion: any) {
    if (estadoVenta(this.peliculaInput() ?? {}) === 'proximamente') {
      alert('Las entradas de esta película todavía no están a la venta.');
      return;
    }
    console.log('usuario', this.authService.usuarioActual(), 'perfil', this.authService.perfilActual(), 'anonimo', this.sesionCompra.esAnonimo(), 'funcion', funcion);
    const peli = this.peliculaInput();
    const edadMinima = peli?.edad_minima || 0;

    const usuarioDB = this.authService.perfilActual();
    const esAnonimo = this.sesionCompra.esAnonimo();

    const hayUsuarioRegistrado = !!this.authService.usuarioActual();

    if (!hayUsuarioRegistrado && !esAnonimo) {
      this.router.navigate(['/auth/login'], { queryParams: { funcionId: funcion.idFuncion, edadMinima } });
      return;
    }

    if (edadMinima > 0) {

      if (esAnonimo && !hayUsuarioRegistrado) {
        alert(`Las películas +${edadMinima} no se pueden comprar como invitado. Redirigiendo al login...`);
        this.router.navigate(['/auth/login'], { queryParams: { funcionId: funcion.idFuncion } });
        return;
      }

      if (hayUsuarioRegistrado && usuarioDB?.fecha_nacimiento) {
        const edadUsuario = this.calcularEdad(usuarioDB.fecha_nacimiento);
        if (edadUsuario < edadMinima) {
          alert(`Control de seguridad: Esta función requiere ser mayor de ${edadMinima} años.`);
          return;
        }
      } else if (hayUsuarioRegistrado) {
        alert("Necesitás configurar tu fecha de nacimiento en tu perfil para comprar esta entrada.");
        return;
      }
    }

    this.reservaService.idFuncionSeleccionada.set(funcion.idFuncion);
    this.reservaService.detalleFuncion.set({
      pelicula: peli?.nombre || 'Película',
      horario: funcion.hora,
      sala: funcion.nombreSala || 'Sala Asignada',
      edadMinima: edadMinima
    });

    this.router.navigate(['/comprar', funcion.idFuncion]);
  }
}