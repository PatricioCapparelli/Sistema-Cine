import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { IPelicula } from '../interfaces/Pelicula';

@Service()
export class PeliculasService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase;

    async crearPelicula(pelicula: IPelicula) {
        const { data, error } = await this.s.from('Peliculas').insert([pelicula]).select();
        if (error) throw error;
        return data;
    }

    async obtenerPeliculas() {
        const { data, error } = await this.s.from('Peliculas').select('*');
        if (error) throw error;
        return data as IPelicula[];
    }

    async eliminarPelicula(id: number) {
        const { error } = await this.s.from('Peliculas').delete().eq('id', id);
        if (error) throw error;
    }

    async obtenerTop3Peliculas() {
        const { data, error } = await this.s
            .from('Peliculas')
            .select(`
            id, 
            nombre, 
            imagen_url, 
            genero,
            Funciones (
                id,
                Ventas (id, cancelada)
            )
        `);

        if (error) {
            console.error('Error de Supabase trayendo el Top 3:', error.message);
            return [];
        }

        if (!data) return [];

        const peliculasConVentas = data.map((peli: any) => {
            const funciones = peli.Funciones || [];
            const totalTickets = funciones.reduce((acc: number, funcion: any) => {
                const ventas = (funcion.Ventas || []).filter((v: any) => !v.cancelada);
                return acc + ventas.length;
            }, 0);

            return {
                ...peli,
                totalTickets
            };
        });
        const peliculasConAlMenosUnaVenta = peliculasConVentas.filter(peli => peli.totalTickets > 0);
        const resultadoFinal = peliculasConAlMenosUnaVenta
            .sort((a, b) => b.totalTickets - a.totalTickets)
            .slice(0, 3);

        console.log('🏆 Top 3 calculado:', resultadoFinal);
        return resultadoFinal;
    }

    async buscarPeliculasPorGenero(termino: string) {
        const { data, error } = await this.s.from('Peliculas')
            .select('*')
            .ilike('genero', `%${termino}%`);

        if (error) throw new Error('Error al filtrar películas');
        return data as IPelicula[];
    }
}