import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { IPelicula } from '../interfaces/Pelicula';

@Service()
export class CineService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase

    async crearPelicula(pelicula: IPelicula) {
        const { data, error } = await this.s
            .from('Peliculas')
            .insert([pelicula])
            .select();

        if (error) throw error;
        return data;
    }
    async obtenerPeliculas() {
        const { data, error } = await this.s
            .from('Peliculas')
            .select('*')

        if (error) throw error;
        return data as IPelicula[];
    }
    async eliminarPelicula(id: number) {
        const { error } = await this.s
            .from('Peliculas')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async obtenerFunciones(ahora: String) {
        const { data: funciones, error } = await this.s
            .from('Funciones')
            .select(`
            id,
            fecha_hora_inicio,
            formato_visual,
            formato_audio,
            Peliculas (*),
            Salas (nombre)
            `)
            .gte('fecha_hora_inicio', ahora)
            .order('fecha_hora_inicio', { ascending: true });

        if (error) throw error;
        return funciones;
    }
}