import { Component, inject, OnInit, signal, effect, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProximamenteService } from '../../core/services/proximamente.service';
import { IProxima } from '../../core/interfaces/Proxima';
import { Auth } from '../../core/services/auth.service';
import { estadoVenta, inicioPreventa } from '../../core/utils/venta-pelicula/venta-pelicula';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css'
})
export class ProximamenteComponent implements OnInit {
  private servicio = inject(ProximamenteService);
  private auth = inject(Auth);
  private router = inject(Router);
  
  peliculas = signal<IProxima[]>([]);
  alertas = signal<Set<number>>(new Set());
  cargando = signal(true);
  error = signal(false);
  procesando = signal<number | null>(null);

  constructor() {
    effect(() => {
      const usuario = this.auth.usuarioActual();
      untracked(() => (usuario ? this.cargarAlertas() : this.alertas.set(new Set())));
    });
  }

  async ngOnInit() {
    try {
      this.peliculas.set(await this.servicio.obtenerProximas());
    } catch (error) {
      console.error(error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  estado(pelicula: IProxima) {
    return estadoVenta(pelicula);
  }

  inicioDePreventa(pelicula: IProxima) {
    return inicioPreventa(pelicula);
  }

  async alternarAlerta(pelicula: IProxima) {
    if (!this.auth.usuarioActual()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    if (this.procesando() !== null) return;
    this.procesando.set(pelicula.id);

    try {
      const activa = this.alertas().has(pelicula.id);
      if (activa) {
        await this.servicio.quitarAlerta(pelicula.id);
      } else {
        await this.servicio.activarAlerta(pelicula.id);
      }
      
      this.alertas.update(actuales => {
        const nuevas = new Set(actuales);
        if (activa) nuevas.delete(pelicula.id);
        else nuevas.add(pelicula.id);
        return nuevas;
      });
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar la alerta.');
    } finally {
      this.procesando.set(null);
    }
  }

  private async cargarAlertas() {
    try {
      this.alertas.set(await this.servicio.obtenerMisAlertas());
    } catch (error) {
      console.error(error);
    }
  }
}