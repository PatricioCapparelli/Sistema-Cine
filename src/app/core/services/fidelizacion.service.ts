import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

export interface IRecompensa {
    id: number;
    nombre: string;
    tipo: 'entrada' | 'candy';
    costo_puntos: number;
    activa: boolean;
}

export interface ICanje {
    id: number;
    nombre_recompensa: string;
    puntos_gastados: number;
    codigo: string;
    estado: string;
    created_at: string;
}

@Injectable({ providedIn: 'root' })
export class FidelizacionService {
    private s = inject(Supabase).Supabase;

    async obtenerRecompensas(soloActivas: boolean): Promise<IRecompensa[]> {
        let consulta = this.s.from('Recompensas').select('*').order('costo_puntos', { ascending: true });
        if (soloActivas) consulta = consulta.eq('activa', true);

        const { data, error } = await consulta;
        if (error) throw new Error('Error al obtener las recompensas');
        return data as IRecompensa[];
    }

    async crearRecompensa(nombre: string, tipo: string, costo: number): Promise<void> {
        const { error } = await this.s.from('Recompensas').insert([{ nombre, tipo, costo_puntos: costo }]);
        if (error) throw new Error('Error al crear la recompensa');
    }

    async actualizarRecompensa(id: number, cambios: Partial<IRecompensa>): Promise<void> {
        const { error } = await this.s.from('Recompensas').update(cambios).eq('id', id);
        if (error) throw new Error('Error al actualizar la recompensa');
    }

    async obtenerSaldo(): Promise<number> {
        const { data, error } = await this.s.rpc('mi_saldo');
        if (error) throw new Error('Error al obtener el saldo');
        return Number(data) || 0;
    }

    async obtenerCanjes(): Promise<ICanje[]> {
        const { data, error } = await this.s.from('Canjes').select('*').order('created_at', { ascending: false });
        if (error) throw new Error('Error al obtener los canjes');
        return data as ICanje[];
    }

    async canjear(recompensaId: number): Promise<string> {
        const { data, error } = await this.s.rpc('canjear_recompensa', { p_recompensa: recompensaId });

        if (error) {
            if (error.message.includes('PUNTOS_INSUFICIENTES')) throw new Error('PUNTOS_INSUFICIENTES');
            throw new Error('Error al canjear la recompensa');
        }

        return data as string;
    }
}