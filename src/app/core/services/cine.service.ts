import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { IPelicula } from '../interfaces/Pelicula';

@Service()
export class CineService {
    private supabase = inject(Supabase);

    async crearPelicula(pelicula: IPelicula) {
        const { data, error } = await this.supabase.Supabase
            .from('peliculas')
            .insert([pelicula])
            .select();

        if (error) throw error;
        return data;
    }
    async obtenerPeliculas() {
        const { data, error } = await this.supabase.Supabase
            .from('peliculas')
            .select('*')

        if (error) throw error;
        return data as IPelicula[];
    }
    async eliminarPelicula(id: number) {
        const { error } = await this.supabase.Supabase
            .from('peliculas')
            .delete()
            .eq('id', id); 

        if (error) throw error;
    }
}