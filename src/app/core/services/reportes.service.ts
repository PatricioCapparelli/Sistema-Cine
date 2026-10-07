import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';

export interface VentaReporte {
    created_at: string;
    monto_total: number | string;
}

export interface ItemRanking {
    nombre: string;
    cantidad: number;
    recaudado: number;
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
                .eq('cancelada', false)
                .gte('created_at', desde.toISOString())
                .order('created_at', { ascending: true })
                .order('id', { ascending: true })
                .range(inicio, inicio + this.TAMANO_PAGINA - 1);

            if (error) throw new Error('Error al obtener las ventas');

            filas.push(...(data || []));
            if (!data || data.length < this.TAMANO_PAGINA) break;
        }

        return filas;
    }

    async obtenerRankingPeliculas(desde: Date): Promise<ItemRanking[]> {
        const { data, error } = await this.s.rpc('ranking_peliculas', { p_desde: desde.toISOString() });
        if (error) throw new Error('Error al obtener el ranking de películas');

        return (data || []).map((fila: any) => ({
            nombre: fila.nombre,
            cantidad: Number(fila.entradas),
            recaudado: Number(fila.recaudado)
        }));
    }

    async obtenerRankingCandy(desde: Date): Promise<ItemRanking[]> {
        const { data, error } = await this.s.rpc('ranking_candy', { p_desde: desde.toISOString() });
        if (error) throw new Error('Error al obtener el ranking del candy bar');

        return (data || []).map((fila: any) => ({
            nombre: fila.nombre,
            cantidad: Number(fila.unidades),
            recaudado: Number(fila.recaudado)
        }));
    }
}