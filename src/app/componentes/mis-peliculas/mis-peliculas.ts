import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProximamenteService } from '../../core/services/proximamente.service';
import { IPeliculaVista } from '../../core/interfaces/Proxima';

@Component({
  selector: 'app-mis-peliculas',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.css'
})
export class MisPeliculasComponent implements OnInit {
  private servicio = inject(ProximamenteService);
  
  peliculas = signal<IPeliculaVista[]>([]);
  cargando = signal(true);
  error = signal(false);

  async ngOnInit() {
    try {
      this.peliculas.set(await this.servicio.obtenerMisPeliculas());
    } catch (error) {
      console.error(error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  estrellas(calificacion: number | null): string {
    const valor = Math.max(0, Math.min(5, calificacion ?? 0));
    return '★'.repeat(valor) + '☆'.repeat(5 - valor);
  }
}