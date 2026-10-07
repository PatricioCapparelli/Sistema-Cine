import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ReportesService } from '../../core/services/reportes.service';
import { ExportacionService, DatosReporte } from '../../core/services/exportacion.service';
import { RankingVentasComponent } from '../ranking-ventas/ranking-ventas';

interface FilaReporte {
  dia: string;
  entradas: number;
  facturado: number;
}

@Component({
  selector: 'app-reporte-facturacion',
  standalone: true,
  imports: [RankingVentasComponent],
  templateUrl: './reporte-facturacion.html',
  styleUrl: './reporte-facturacion.css'
})
export class ReporteFacturacionComponent implements OnInit {
  private reportesService = inject(ReportesService);
  private exportacion = inject(ExportacionService);

  private ultimaSolicitud = 0;

  private formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });

  readonly RANGOS = [
    { etiqueta: 'Hoy', dias: 1 },
    { etiqueta: '7 días', dias: 7 },
    { etiqueta: '30 días', dias: 30 },
    { etiqueta: '90 días', dias: 90 }
  ];

  rangoActivo = signal(7);
  filas = signal<FilaReporte[]>([]);
  cargando = signal(false);
  error = signal(false);
  exportando = signal<'excel' | 'pdf' | null>(null);

  totalEntradas = computed(() => this.filas().reduce((acc, f) => acc + f.entradas, 0));
  totalFacturado = computed(() => this.filas().reduce((acc, f) => acc + f.facturado, 0));

  puedeExportar = computed(() =>
    !this.cargando() && !this.error() && this.exportando() === null && this.filas().length > 0
  );

  async ngOnInit() {
    await this.cargar(this.rangoActivo());
  }

  async cargar(dias: number) {
    const solicitud = ++this.ultimaSolicitud;
    this.rangoActivo.set(dias);
    this.cargando.set(true);
    this.error.set(false);

    try {
      const ventas = await this.reportesService.obtenerVentasDesde(this.inicioDelRango(dias));
      if (solicitud !== this.ultimaSolicitud) return;

      const porDia = new Map<string, FilaReporte>();

      for (const venta of ventas) {
        const clave = this.claveDia(new Date(venta.created_at));
        const fila = porDia.get(clave) ?? { dia: clave, entradas: 0, facturado: 0 };
        fila.entradas += 1;
        fila.facturado += Number(venta.monto_total) || 0;
        porDia.set(clave, fila);
      }

      this.filas.set([...porDia.values()].sort((a, b) => b.dia.localeCompare(a.dia)));
    } catch (error) {
      console.error('Error al generar el reporte', error);
      if (solicitud !== this.ultimaSolicitud) return;
      this.filas.set([]);
      this.error.set(true);
    } finally {
      if (solicitud === this.ultimaSolicitud) this.cargando.set(false);
    }
  }

  async exportarExcel() {
    await this.exportar('excel');
  }

  async exportarPdf() {
    await this.exportar('pdf');
  }

  moneda(valor: number): string {
    return this.formatoMoneda.format(valor);
  }

  fechaLegible(clave: string): string {
    const [anio, mes, dia] = clave.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private async exportar(tipo: 'excel' | 'pdf') {
    if (!this.puedeExportar()) return;

    this.exportando.set(tipo);
    try {
      const datos = this.armarDatos();

      if (tipo === 'excel') {
        await this.exportacion.exportarExcel(datos);
      } else {
        await this.exportacion.exportarPdf(datos);
      }
    } catch (error) {
      console.error('Error al exportar el reporte', error);
      alert('No se pudo generar el archivo. Intentá de nuevo.');
    } finally {
      this.exportando.set(null);
    }
  }

  private armarDatos(): DatosReporte {
    const dias = this.rangoActivo();
    const desde = this.inicioDelRango(dias);
    const hoy = new Date();
    const etiqueta = this.RANGOS.find(r => r.dias === dias)?.etiqueta ?? `Últimos ${dias} días`;

    return {
      titulo: 'Reporte de facturación',
      periodo: `${etiqueta}: del ${desde.toLocaleDateString('es-AR')} al ${hoy.toLocaleDateString('es-AR')}`,
      nombreArchivo: `facturacion_${this.claveDia(desde)}_a_${this.claveDia(hoy)}`,
      filas: [...this.filas()].sort((a, b) => a.dia.localeCompare(b.dia)),
      totalEntradas: this.totalEntradas(),
      totalFacturado: this.totalFacturado()
    };
  }

  private inicioDelRango(dias: number): Date {
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (dias - 1));
    return desde;
  }

  private claveDia(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}