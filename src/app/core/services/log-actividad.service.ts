import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';

export type GrupoLog = 'todo' | 'funciones' | 'precios' | 'validaciones';

export interface ILogActividad {
    id: number;
    created_at: string;
    usuario_id: string | null;
    usuario_email: string | null;
    usuario_nombre: string | null;
    accion: string;
    detalle: string;
}

export interface FiltroLog {
    grupo: GrupoLog;
    desde: Date | null;
    pagina: number;
    tamano: number;
}

const ACCIONES_POR_GRUPO: Record<Exclude<GrupoLog, 'todo'>, string[]> = {
    funciones: ['funcion_creada', 'funcion_eliminada'],
    precios: ['precio_modificado'],
    validaciones: ['qr_validado', 'canje_validado']
};

@Service()
export class LogActividadService {
    private s = inject(Supabase).Supabase;

    async obtener(filtro: FiltroLog): Promise<{ filas: ILogActividad[]; total: number }> {
        let consulta = this.s.from('Log_Actividad')
            .select('id, created_at, usuario_id, usuario_email, usuario_nombre, accion, detalle', { count: 'exact' })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false });

        if (filtro.grupo !== 'todo') consulta = consulta.in('accion', ACCIONES_POR_GRUPO[filtro.grupo]);
        if (filtro.desde) consulta = consulta.gte('created_at', filtro.desde.toISOString());

        const inicio = filtro.pagina * filtro.tamano;
        const { data, error, count } = await consulta.range(inicio, inicio + filtro.tamano - 1);

        if (error) throw new Error('Error al obtener el log de actividad');
        return { filas: (data || []) as ILogActividad[], total: count ?? 0 };
    }
}