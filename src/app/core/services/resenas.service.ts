import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';

@Service()
export class ResenasService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase;

    async dejarResena(peliculaId: number, usuarioId: string, estrellas: number, comentario: string) {
        const { error } = await this.s.from('Resenas').insert([{
            pelicula_id: peliculaId, 
            usuario_id: usuarioId, 
            estrellas, 
            comentario 
        }]);
        if (error) throw new Error('Error al guardar la reseña');
    }

    async obtenerResenasYPromedio(peliculaId: number) {
        const { data, error } = await this.s.from('Resenas')
            .select('id, estrellas, comentario, Usuarios(nombre, apellido)')
            .eq('pelicula_id', peliculaId);

        if (error) throw new Error('Error al obtener reseñas');

        const resenas = data || [];
        let promedio = 0;
        
        if (resenas.length > 0) {
            const sumaTotal = resenas.reduce((acc, resena) => acc + resena.estrellas, 0);
            promedio = sumaTotal / resenas.length;
        }

        return { resenas, promedio: promedio.toFixed(1) };
    }
}