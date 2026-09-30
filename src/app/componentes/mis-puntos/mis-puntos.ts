import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FidelizacionService, ICanje, IRecompensa } from '../../core/services/fidelizacion.service';

@Component({
  selector: 'app-mis-puntos',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mis-puntos.html'
})
export class MisPuntosComponent implements OnInit {
  private fidelizacion = inject(FidelizacionService);

  saldo = signal(0);
  recompensas = signal<IRecompensa[]>([]);
  canjes = signal<ICanje[]>([]);

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
    } catch (error) {
      console.error(error);
    }
  }

  async canjear(recompensa: IRecompensa) {
    if (!confirm(`¿Canjear ${recompensa.costo_puntos} puntos por "${recompensa.nombre}"?`)) return;

    try {
      const codigo = await this.fidelizacion.canjear(recompensa.id);
      alert(`Canje exitoso. Tu código es ${codigo}. Mostralo en el mostrador.`);
    } catch (error: any) {
      alert(error.message === 'PUNTOS_INSUFICIENTES'
        ? 'No tenés puntos suficientes.'
        : 'No se pudo realizar el canje.');
    }

    await this.cargar();
  }
}