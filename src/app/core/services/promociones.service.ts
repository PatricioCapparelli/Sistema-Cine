import { inject, Service } from '@angular/core';
import { Supabase } from './supabase.service';

@Service()
export class PromocionesService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase

    async obtenerPromocionesActivas() {
        const { data, error } = await this.s
            .from('Promociones')
            .select('*')
            .eq('activo', true);

        if (error) throw error;
        return data;
    }

    async obtenerTodasLasPromociones() {
        const { data, error } = await this.s
            .from('Promociones')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    }

    async guardarPromocion(promocion: any) {
        if (promocion.id) {
            const { error } = await this.s
                .from('Promociones')
                .update(promocion)
                .eq('id', promocion.id);
            if (error) throw error;
        } else {
            const { id, ...datosAInsertar } = promocion;
            const { error } = await this.s
                .from('Promociones')
                .insert([datosAInsertar]);
            if (error) throw error;
        }
    }

    async eliminarPromocion(id: number) {
        const { error } = await this.s
            .from('Promociones')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}