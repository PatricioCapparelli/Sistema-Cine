import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ReportesService, ItemRanking } from '../../core/services/reportes.service';

@Component({
  selector: 'app-ranking-ventas',
  standalone: true,
  templateUrl: './ranking-ventas.html',
  styleUrl: './ranking-ventas.css'
})
export class RankingVentasComponent implements OnInit {
  private reportes = inject(ReportesService);

  private ultimaSolicitud = 0;

  private formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });

  readonly PERIODOS = [
    { etiqueta: 'Últimos 7 días', dias: 7 },
    { etiqueta: 'Últimos 30 días', dias: 30 }
  ];

  periodo = signal(7);
  peliculas = signal<ItemRanking[]>([]);
  candy = signal<ItemRanking[]>([]);
  cargando = signal(true);
  error = signal(false);

  maxPeliculas = computed(() => Math.max(1, ...this.peliculas().map(p => p.cantidad)));
  maxCandy = computed(() => Math.max(1, ...this.candy().map(p => p.cantidad)));
  masVendido = computed(() => this.candy()[0] ?? null);

  async ngOnInit() {
    await this.cargar(this.periodo());
  }

  async cargar(dias: number) {
    const solicitud = ++this.ultimaSolicitud;
    this.periodo.set(dias);
    this.cargando.set(true);
    this.error.set(false);

    try {
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      desde.setDate(desde.getDate() - (dias - 1));

      const [peliculas, candy] = await Promise.all([
        this.reportes.obtenerRankingPeliculas(desde),
        this.reportes.obtenerRankingCandy(desde)
      ]);

      if (solicitud !== this.ultimaSolicitud) return;

      this.peliculas.set(peliculas);
      this.candy.set(candy);
    } catch (error) {
      console.error('Error al cargar los rankings', error);
      if (solicitud === this.ultimaSolicitud) this.error.set(true);
    } finally {
      if (solicitud === this.ultimaSolicitud) this.cargando.set(false);
    }
  }

  porcentaje(valor: number, maximo: number): number {
    return Math.max(4, Math.round((valor / maximo) * 100));
  }

  moneda(valor: number): string {
    return this.formatoMoneda.format(valor);
  }
}