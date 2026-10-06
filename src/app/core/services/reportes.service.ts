import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';

export interface VentaReporte {
    created_at: string;
    monto_total: number | string;
}

@Service()
export class ReportesService {
    private s = inject(Supabase).Supabase;

    private readonly TAMANO_PAGINA = 1000;

    async obtenerVentasDesde(desde: Date): Promise<VentaReporte[]> {
        const filas: VentaReporte[] = [];

        for (let inicio = 0; ; inicio += this.TAMANO_PAGINA) {
            const { data, error } = await this.s.from('Ventas')
                .select('created_at, monto_total')
                .gte('created_at', desde.toISOString())
                .eq('cancelada', false)
                .order('created_at', { ascending: true })
                .order('id', { ascending: true })
                .range(inicio, inicio + this.TAMANO_PAGINA - 1);

            if (error) throw new Error('Error al obtener las ventas');

            filas.push(...(data || []));
            if (!data || data.length < this.TAMANO_PAGINA) break;
        }

        return filas;
    }
}