import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FidelizacionService } from '../../core/services/fidelizacion.service';
import { IRecompensa, ICanje } from '../../core/interfaces/Canje';

@Component({
  selector: 'app-mis-puntos',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mis-puntos.html'
})
export class MisPuntosComponent implements OnInit {
  private fidelizacion = inject(FidelizacionService);

  private readonly MENSAJES_ERROR: Record<string, string> = {
    PUNTOS_INSUFICIENTES: 'No tenés puntos suficientes.',
    RECOMPENSA_INVALIDA: 'Esa recompensa ya no está disponible.',
    NO_AUTENTICADO: 'Tu sesión venció. Volvé a iniciar sesión.'
  };

  saldo = signal(0);
  recompensas = signal<IRecompensa[]>([]);
  canjes = signal<ICanje[]>([]);
  canjeando = signal(false);
  errorCarga = signal(false);
  ultimoCanje = signal<{ codigo: string; recompensa: string } | null>(null);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    try {
      const [saldo, recompensas, canjes] = await Promise.all([
        this.fidelizacion.obtenerSaldo(),
        this.fidelizacion.obtenerRecompensas(true),
        this.fidelizacion.obtenerCanjes()
      ]);

      this.saldo.set(saldo);
      this.recompensas.set(recompensas);
      this.canjes.set(canjes);
      this.errorCarga.set(false);
    } catch (error) {
      console.error(error);
      this.errorCarga.set(true);
    }
  }

  async canjear(recompensa: IRecompensa) {
    if (this.canjeando()) return;
    if (!confirm(`¿Canjear ${recompensa.costo_puntos} puntos por "${recompensa.nombre}"?`)) return;

    this.canjeando.set(true);
    try {
      const codigo = await this.fidelizacion.canjear(recompensa.id);
      this.ultimoCanje.set({ codigo, recompensa: recompensa.nombre });
    } catch (error: any) {
      alert(this.MENSAJES_ERROR[error.message] ?? 'No se pudo realizar el canje.');
    } finally {
      this.canjeando.set(false);
    }

    await this.cargar();
  }

  cerrarAviso() {
    this.ultimoCanje.set(null);
  }
}