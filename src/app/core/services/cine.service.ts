import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { IPelicula } from '../interfaces/Pelicula';
import { IFuncion } from '../interfaces/Funcion';

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

    async guardarFuncion(nuevaFuncion: IFuncion): Promise<void> {
        const inicioNueva = new Date(nuevaFuncion.fecha_hora_inicio);

        const { data: peliData, error: errPeli } = await this.s
            .from('Peliculas')
            .select('duracion_minutos')
            .eq('id', nuevaFuncion.pelicula_id)
            .single();

        if (errPeli) throw new Error('Error al obtener datos de la película');

        const duracionNuevaPeli = peliData.duracion_minutos;
        const finNueva = new Date(inicioNueva.getTime() + (duracionNuevaPeli + 30) * 60000);

        const { data: funcionesExistentes, error: errFunciones } = await this.s
            .from('Funciones')
            .select('fecha_hora_inicio, Peliculas(duracion_minutos)')
            .eq('sala_id', nuevaFuncion.sala_id);

        if (errFunciones) throw new Error('Error al obtener las funciones de la sala');

        if (funcionesExistentes) {
            for (const func of funcionesExistentes) {
                const inicioExistente = new Date(func.fecha_hora_inicio);
                const duracionExistente = (func.Peliculas as any).duracion_minutos;
                const finExistente = new Date(inicioExistente.getTime() + (duracionExistente + 30) * 60000);

                if (inicioNueva < finExistente && inicioExistente < finNueva) {
                    throw new Error('CONFLICTO_HORARIO');
                }
            }
        }

        const { error: errInsert } = await this.s
            .from('Funciones')
            .insert([nuevaFuncion]);

        if (errInsert) throw new Error('Error al insertar la función');
    }

    async eliminarFuncion(idFuncion: number | string): Promise<void> {
        const { error } = await this.s
            .from('Funciones')
            .delete()
            .eq('id', idFuncion);

        if (error) throw new Error('No se pudo eliminar la función');
    }
}