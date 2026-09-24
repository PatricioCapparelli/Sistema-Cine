import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { IFuncion } from '../interfaces/Funcion';
import { Venta } from '../interfaces/Venta';

@Service()
export class FuncionesService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase;

    async obtenerFunciones(ahora: String) {
        const { data: funciones, error } = await this.s.from('Funciones').select(`
            id, fecha_hora_inicio, formato_visual, formato_audio,
            Peliculas (*), Salas (nombre)
        `).gte('fecha_hora_inicio', ahora).order('fecha_hora_inicio', { ascending: true });

        if (error) throw error;
        return funciones;
    }

    async guardarFuncion(nuevaFuncion: IFuncion): Promise<void> {
        const inicioNueva = new Date(nuevaFuncion.fecha_hora_inicio);
        const { data: peliData, error: errPeli } = await this.s.from('Peliculas').select('duracion_minutos').eq('id', nuevaFuncion.pelicula_id).single();
        if (errPeli) throw new Error('Error al obtener datos de la película');

        const duracionNuevaPeli = peliData.duracion_minutos;
        const finNueva = new Date(inicioNueva.getTime() + (duracionNuevaPeli + 30) * 60000);

        const { data: funcionesExistentes, error: errFunciones } = await this.s.from('Funciones').select('fecha_hora_inicio, Peliculas(duracion_minutos)').eq('sala_id', nuevaFuncion.sala_id);
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

        const { error: errInsert } = await this.s.from('Funciones').insert([nuevaFuncion]);
        if (errInsert) throw new Error('Error al insertar la función');
    }

    async programarFuncionesAutomaticas(peliculaId: string, horariosSolicitados: string[], formatoVisual: string, formatoAudio: string): Promise<void> {
        const { data: peliData, error: errPeli } = await this.s.from('Peliculas')
            .select('duracion_minutos')
            .eq('id', peliculaId)
            .single();

        if (errPeli || !peliData) throw new Error('Error al obtener datos de la pelicula');
        const duracion = peliData.duracion_minutos;

        const { data: salas, error: errSalas } = await this.s.from('Salas').select('id, nombre');
        if (errSalas || !salas) throw new Error('Error al obtener las salas del sistema');

        const funcionesAInsertar: any[] = [];
        const reportesError: string[] = [];

        for (const horarioStr of horariosSolicitados) {
            const inicioNuevo = new Date(horarioStr);
            const finNuevo = new Date(inicioNuevo.getTime() + (duracion + 30) * 60000);

            let salaAsignada = null;

            for (const sala of salas) {
                const { data: funcionesSala } = await this.s.from('Funciones')
                    .select('fecha_hora_inicio, Peliculas(duracion_minutos)')
                    .eq('sala_id', sala.id);

                let hayConflicto = false;

                if (funcionesSala) {
                    for (const func of funcionesSala) {
                        const inicioExistente = new Date(func.fecha_hora_inicio);
                        const duracionExistente = (func.Peliculas as any).duracion_minutos;
                        const finExistente = new Date(inicioExistente.getTime() + (duracionExistente + 30) * 60000);

                        if (inicioNuevo < finExistente && inicioExistente < finNuevo) {
                            hayConflicto = true;
                            break;
                        }
                    }
                }

                if (!hayConflicto) {
                    const colisionMemoria = funcionesAInsertar.some(f => {
                        if (f.sala_id !== sala.id) return false;
                        const inicioMem = new Date(f.fecha_hora_inicio);
                        const finMem = new Date(inicioMem.getTime() + (duracion + 30) * 60000);
                        return inicioNuevo < finMem && inicioMem < finNuevo;
                    });
                    if (colisionMemoria) hayConflicto = true;
                }

                if (!hayConflicto) {
                    salaAsignada = sala.id;
                    break;
                }
            }

            if (salaAsignada) {
                funcionesAInsertar.push({
                    pelicula_id: peliculaId,
                    sala_id: salaAsignada,
                    fecha_hora_inicio: horarioStr,
                    formato_visual: formatoVisual,
                    formato_audio: formatoAudio
                });
            } else {
                reportesError.push(`No hay salas físicas disponibles para el horario: ${inicioNuevo.toLocaleString()}`);
            }
        }

        if (reportesError.length > 0) {
            throw new Error('La programacion fue abortada:\n' + reportesError.join('\n'));
        }

        if (funcionesAInsertar.length > 0) {
            const { error: errInsert } = await this.s.from('Funciones').insert(funcionesAInsertar);
            if (errInsert) throw new Error('Error crítico al guardar la programación automática.');
        }
    }

    async eliminarFuncion(idFuncion: number | string): Promise<void> {
        const { error } = await this.s.from('Funciones').delete().eq('id', idFuncion);
        if (error) throw new Error('No se pudo eliminar la función');
    }

    async obtenerDetalleFuncion(id: string) {
        const { data, error } = await this.s.from('Funciones').select('fecha_hora_inicio, Peliculas(nombre), Salas(nombre)').eq('id', id).single();
        if (error) throw new Error('Error al obtener el detalle de la función');
        return data;
    }
    async obtenerButacasOcupadas(funcionId: string) {
        const { data, error } = await this.s.from('Ventas').select('butaca_id').eq('funcion_id', funcionId);
        if (error) throw new Error('Error al obtener las butacas ocupadas');
        return data || [];
    }

    async registrarVentas(ventas: Venta[]) {
        const { data, error } = await this.s.from('Ventas').insert(ventas).select();

        if (error) {
            console.error('Error de Supabase al insertar Venta:', error);
            throw new Error('Error al registrar la venta');
        }

        return data;
    }

    async validarTicketEscaneado(idTicket: string) {
        const { data: ticket, error } = await this.s.from('Ventas')
            .select('id, entrada_usada, butaca_id, Peliculas(nombre)')
            .eq('id', idTicket)
            .single();

        if (error || !ticket) throw new Error('Ticket no valido o inexistente.');

        if (ticket.entrada_usada) throw new Error(`ALERTA! Este ticket ya fue utilizado. (Butaca: ${ticket.butaca_id})`);

        const { error: updateError } = await this.s.from('Ventas')
            .update({ entrada_usada: true })
            .eq('id', idTicket);

        if (updateError) throw new Error('Error al actualizar el ticket en el sistema.');

        const { data: candy } = await this.s.from('Venta_Candy')
            .select('cantidad, Productos_Candy(nombre)')
            .eq('id_ticket', idTicket);

        return {
            mensaje: `Ticket Valido. Pase a Butaca ${ticket.butaca_id}`,
            pelicula: (ticket.Peliculas as any).nombre,
            candy: candy || []
        };
    }
}