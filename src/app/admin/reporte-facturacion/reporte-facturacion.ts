import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ReportesService } from '../../core/services/reportes.service';

interface FilaReporte {
  dia: string;
  entradas: number;
  facturado: number;
}

@Component({
  selector: 'app-reporte-facturacion',
  standalone: true,
  templateUrl: './reporte-facturacion.html',
  styleUrl: './reporte-facturacion.css'
})
export class ReporteFacturacionComponent implements OnInit {
  private reportesService = inject(ReportesService);

  readonly RANGOS = [
    { etiqueta: 'Hoy', dias: 1 },
    { etiqueta: '7 días', dias: 7 },
    { etiqueta: '30 días', dias: 30 },
    { etiqueta: '90 días', dias: 90 }
  ];

  private formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });

  rangoActivo = signal(7);
  filas = signal<FilaReporte[]>([]);
  cargando = signal(false);
  error = signal(false);

  totalEntradas = computed(() => this.filas().reduce((acc, f) => acc + f.entradas, 0));
  totalFacturado = computed(() => this.filas().reduce((acc, f) => acc + f.facturado, 0));

  async ngOnInit() {
    await this.cargar(this.rangoActivo());
  }

  async cargar(dias: number) {
    this.rangoActivo.set(dias);
    this.cargando.set(true);
    this.error.set(false);

    try {
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      desde.setDate(desde.getDate() - (dias - 1));

      const ventas = await this.reportesService.obtenerVentasDesde(desde);
      const porDia = new Map<string, FilaReporte>();

      for (const venta of ventas) {
        const fecha = new Date(venta.created_at);
        const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        const fila = porDia.get(clave) ?? { dia: clave, entradas: 0, facturado: 0 };
        fila.entradas += 1;
        fila.facturado += Number(venta.monto_total) || 0;
        porDia.set(clave, fila);
      }

      this.filas.set([...porDia.values()].sort((a, b) => b.dia.localeCompare(a.dia)));
    } catch (error) {
      console.error('Error al generar el reporte', error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  moneda(valor: number): string {
    return this.formatoMoneda.format(valor);
  }

  fechaLegible(clave: string): string {
    const [anio, mes, dia] = clave.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}