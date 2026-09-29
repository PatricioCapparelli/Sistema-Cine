import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Supabase } from './supabase.service';
import { IFuncion } from '../interfaces/Funcion';
import { Venta } from '../interfaces/Venta';

@Injectable({
    providedIn: 'root'
})
export class FuncionesService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase;

    private readonly MARGEN_MINUTOS = 30;

    private calcularFin(inicio: Date, duracionMinutos: number): Date {
        return new Date(inicio.getTime() + (duracionMinutos + this.MARGEN_MINUTOS) * 60000);
    }

    private haySolapamiento(inicioA: Date, finA: Date, inicioB: Date, finB: Date): boolean {
        return inicioA < finB && inicioB < finA;
    }

    private async obtenerDuracion(peliculaId: string | number): Promise<number> {
        const { data, error } = await this.s.from('Peliculas')
            .select('duracion_minutos')
            .eq('id', peliculaId)
            .single();

        if (error || !data) throw new Error('Error al obtener datos de la pelicula');
        return data.duracion_minutos;
    }

    private async salaTieneConflicto(salaId: string | number, inicio: Date, fin: Date): Promise<boolean> {
        const { data, error } = await this.s.from('Funciones')
            .select('fecha_hora_inicio, Peliculas(duracion_minutos)')
            .eq('sala_id', salaId);

        if (error) throw new Error('Error al obtener las funciones de la sala');

        return (data || []).some(func => {
            const inicioExistente = new Date(func.fecha_hora_inicio);
            const finExistente = this.calcularFin(inicioExistente, (func.Peliculas as any).duracion_minutos);
            return this.haySolapamiento(inicio, fin, inicioExistente, finExistente);
        });
    }

    async obtenerFunciones(ahora: string) {
        const { data, error } = await this.s.from('Funciones').select(`
            id, fecha_hora_inicio, formato_visual, formato_audio,
            Peliculas (*), Salas (nombre)
        `).gte('fecha_hora_inicio', ahora).order('fecha_hora_inicio', { ascending: true });

        if (error) throw error;
        return data;
    }

    async guardarFuncion(nuevaFuncion: IFuncion): Promise<void> {
        const inicio = new Date(nuevaFuncion.fecha_hora_inicio);
        const duracion = await this.obtenerDuracion(nuevaFuncion.pelicula_id);
        const fin = this.calcularFin(inicio, duracion);

        if (await this.salaTieneConflicto(nuevaFuncion.sala_id, inicio, fin)) {
            throw new Error('CONFLICTO_HORARIO');
        }

        const { error } = await this.s.from('Funciones').insert([nuevaFuncion]);
        if (error) throw new Error('Error al insertar la función');
    }

    async programarFuncionesAutomaticas(
        peliculaId: string,
        horariosSolicitados: string[],
        formatoVisual: string,
        formatoAudio: string
    ): Promise<void> {
        const duracion = await this.obtenerDuracion(peliculaId);

        const { data: salas, error: errSalas } = await this.s.from('Salas').select('id, nombre');
        if (errSalas || !salas) throw new Error('Error al obtener las salas del sistema');

        const funcionesAInsertar: any[] = [];
        const reportesError: string[] = [];

        for (const horario of horariosSolicitados) {
            const inicio = new Date(horario);
            const fin = this.calcularFin(inicio, duracion);

            let salaAsignada: string | number | null = null;

            for (const sala of salas) {
                const colisionPendiente = funcionesAInsertar.some(f => {
                    if (f.sala_id !== sala.id) return false;
                    const inicioPendiente = new Date(f.fecha_hora_inicio);
                    return this.haySolapamiento(inicio, fin, inicioPendiente, this.calcularFin(inicioPendiente, duracion));
                });

                if (colisionPendiente) continue;
                if (await this.salaTieneConflicto(sala.id, inicio, fin)) continue;

                salaAsignada = sala.id;
                break;
            }

            if (salaAsignada === null) {
                reportesError.push(`No hay salas físicas disponibles para el horario: ${inicio.toLocaleString()}`);
                continue;
            }

            funcionesAInsertar.push({
                pelicula_id: peliculaId,
                sala_id: salaAsignada,
                fecha_hora_inicio: horario,
                formato_visual: formatoVisual,
                formato_audio: formatoAudio
            });
        }

        if (reportesError.length > 0) {
            throw new Error('La programacion fue abortada:\n' + reportesError.join('\n'));
        }

        if (funcionesAInsertar.length > 0) {
            const { error } = await this.s.from('Funciones').insert(funcionesAInsertar);
            if (error) throw new Error('Error crítico al guardar la programación automática.');
        }
    }

    async eliminarFuncion(idFuncion: number | string): Promise<void> {
        const { error } = await this.s.from('Funciones').delete().eq('id', idFuncion);
        if (error) throw new Error('No se pudo eliminar la función');
    }

    async obtenerDetalleFuncion(id: string) {
        const { data, error } = await this.s.from('Funciones')
            .select('fecha_hora_inicio, Peliculas(nombre, edad_minima), Salas(nombre)')
            .eq('id', id)
            .single();

        if (error) throw new Error('Error al obtener el detalle de la función');
        return data;
    }

    async obtenerButacasOcupadas(funcionId: string) {
        const { data, error } = await this.s.from('Ventas')
            .select('butaca_id')
            .eq('funcion_id', funcionId);

        if (error) throw new Error('Error al obtener las butacas ocupadas');
        return data || [];
    }

    suscribirseAVentas(funcionId: string, alNuevaVenta: (butacaId: string) => void): RealtimeChannel {
        return this.s
            .channel(`ventas-funcion-${funcionId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Ventas', filter: `funcion_id=eq.${funcionId}` },
                (payload) => alNuevaVenta((payload.new as any).butaca_id)
            )
            .subscribe();
    }

    quitarSuscripcion(canal: RealtimeChannel): void {
        this.s.removeChannel(canal);
    }

    async registrarVentas(ventas: Venta[]) {
        const { data, error } = await this.s.from('Ventas').insert(ventas).select();

        if (error) {
            console.error('Error de Supabase al insertar Venta:', error);
            if (error.code === '23505') {
                throw new Error('BUTACA_YA_VENDIDA');
            }
            throw new Error('Error al registrar la venta');
        }

        return data;
    }

    async validarTicketEscaneado(codigo: string) {
        const esUUID = codigo.length > 10;
        const codigoLimpio = esUUID ? codigo : codigo.toUpperCase().trim();

        let query = this.s.from('Ventas')
            .select('id, entrada_usada, butaca_id, codigo_manual, Funciones(Peliculas(nombre))');

        query = esUUID
            ? query.eq('id', codigoLimpio)
            : query.eq('codigo_manual', codigoLimpio).limit(1);

        const { data: ticket, error: ticketError } = await query.maybeSingle();

        if (ticketError) {
            console.error('Error BD Escaner:', ticketError);
            throw new Error(`Falla tecnica BD: ${ticketError.message}`);
        }

        if (!ticket) {
            throw new Error(`No se encontro el codigo: "${codigoLimpio}".`);
        }

        if (ticket.entrada_usada) {
            throw new Error(`ALERTA! Este ticket ya fue utilizado. (Butaca: ${ticket.butaca_id})`);
        }

        const { error: updateError } = await this.s.from('Ventas')
            .update({ entrada_usada: true })
            .eq('id', ticket.id);

        if (updateError) {
            throw new Error('Error al actualizar el ticket en el sistema.');
        }

        const { data: candy } = await this.s.from('Venta_Candy')
            .select('cantidad, Productos_Candy(nombre)')
            .eq('id_ticket', ticket.id);

        return {
            mensaje: `Ticket Valido. Pase a Butaca ${ticket.butaca_id}`,
            pelicula: (ticket.Funciones as any)?.Peliculas?.nombre || 'Pelicula desconocida',
            candy: candy || []
        };
    }
}