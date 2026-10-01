import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { ComboNuevo, ICombo } from '../interfaces/Combo';

@Service()
export class CombosService {
    private s = inject(Supabase).Supabase;

    async obtener(soloActivos: boolean): Promise<ICombo[]> {
        let consulta = this.s.from('combos').select('*')
            .order('destacado', { ascending: false })
            .order('precio', { ascending: true });

        if (soloActivos) consulta = consulta.eq('activo', true);

        const { data, error } = await consulta;
        if (error) throw new Error('Error al obtener los combos');
        return (data || []).map(c => ({ ...c, precio: Number(c.precio) })) as ICombo[];
    }

    async crear(combo: ComboNuevo): Promise<void> {
        const { error } = await this.s.from('combos').insert([combo]);
        if (error) throw new Error('Error al crear el combo');
    }

    async actualizar(id: string, cambios: Partial<Omit<ICombo, 'id'>>): Promise<void> {
        const { error } = await this.s.from('combos').update(cambios).eq('id', id);
        if (error) throw new Error('Error al actualizar el combo');
    }

    async eliminar(id: string): Promise<void> {
        const { error } = await this.s.from('combos').delete().eq('id', id);
        if (error) throw new Error('Error al eliminar el combo');
    }
}