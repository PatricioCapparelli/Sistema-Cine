import { Component, inject, OnInit, signal, effect, untracked, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProximamenteService } from '../../core/services/proximamente.service';
import { IProxima } from '../../core/interfaces/Proxima';
import { Auth } from '../../core/services/auth.service';
import { estadoVenta, inicioPreventa } from '../../core/utils/venta-pelicula/venta-pelicula';
import { NotificacionesService } from '../../core/services/notificaciones.service';

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
  private notificaciones = inject(NotificacionesService);

  peliculas = signal<IProxima[]>([]);
  alertas = signal<Set<number>>(new Set());
  cargando = signal(true);
  error = signal(false);
  procesando = signal<number | null>(null);

  puedeActivar = computed(() => this.notificaciones.permiso() === 'default');
  avisoPermiso = computed(() => {
  if (this.alertas().size === 0) return null;

  switch (this.notificaciones.permiso()) {
    case 'denied':
      return 'Tenés bloqueadas las notificaciones de este sitio. Te avisamos dentro de la app; para recibirlas también en el escritorio, habilitalas desde el candado junto a la dirección.';
    case 'default':
      return 'Todavía no activaste las notificaciones del navegador. Mientras tanto te avisamos dentro de la app.';
    case 'no-soportado':
      return 'Tu navegador no admite notificaciones. Te avisamos dentro de la app.';
    default:
      return null;
  }
});

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

  const activa = this.alertas().has(pelicula.id);
  this.procesando.set(pelicula.id);

  try {
    if (activa) {
      await this.servicio.quitarAlerta(pelicula.id);
    } else {
      const permiso = await this.notificaciones.pedirPermiso();
      await this.servicio.activarAlerta(pelicula.id);

      if (permiso === 'granted') {
        this.notificaciones.mostrar(
          'Alerta activada',
          `Te avisamos cuando salgan las entradas de "${pelicula.nombre}".`,
          `alerta-${pelicula.id}`,
          '/proximamente'
        );
      }
    }

    this.alertas.update(actuales => {
      const nuevas = new Set(actuales);
      if (activa) nuevas.delete(pelicula.id);
      else nuevas.add(pelicula.id);
      return nuevas;
    });

    if (!activa) void this.servicio.cargarAvisos();
  } catch (error) {
    console.error(error);
    alert('No se pudo actualizar la alerta.');
  } finally {
    this.procesando.set(null);
  }
}

async activarNotificaciones() {
  await this.notificaciones.pedirPermiso();
  void this.servicio.cargarAvisos();
}

  private async cargarAlertas() {
    try {
      this.alertas.set(await this.servicio.obtenerMisAlertas());
    } catch (error) {
      console.error(error);
    }
  }
}