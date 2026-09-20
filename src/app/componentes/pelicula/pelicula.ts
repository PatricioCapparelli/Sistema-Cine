import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { IPelicula } from '../../core/interfaces/Pelicula';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormatoDuracionPipe } from '../../core/pipes/formato-duracion-pipe';
import { FormsModule } from '@angular/forms';
import { ResenasService } from '../../core/services/resenas.service';
import { Auth } from '../../core/services/auth.service'; 

@Component({
  selector: 'app-pelicula',
  standalone: true,
  imports: [RouterLink, DatePipe, FormatoDuracionPipe, FormsModule],
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

  modalAbierto = signal<boolean>(false);
  listaResenas = signal<any[]>([]);
  promedioEstrellas = signal<string>('0.0');
  nuevaCalificacion = signal<number>(5);
  nuevoComentario = signal<string>('');

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
}