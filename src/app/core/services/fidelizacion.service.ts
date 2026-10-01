import { Service, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { IRecompensa, ICanje } from '../interfaces/Canje';

@Service()
export class FidelizacionService {
    private s = inject(Supabase).Supabase;

    private readonly ERRORES_CANJE: Record<string, string> = {
        PUNTOS_INSUFICIENTES: 'PUNTOS_INSUFICIENTES',
        RECOMPENSA_INVALIDA: 'RECOMPENSA_INVALIDA',
        NO_AUTENTICADO: 'NO_AUTENTICADO'
    };

    private readonly ERRORES_VALIDACION: Record<string, string> = {
        CANJE_INVALIDO: 'El código no existe o ya fue utilizado.',
        NO_AUTORIZADO: 'No tenés permiso para validar canjes.'
    };

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

    async actualizarRecompensa(id: number, cambios: Partial<Omit<IRecompensa, 'id'>>): Promise<void> {
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
            throw new Error(this.traducirError(error.message, this.ERRORES_CANJE, 'Error al canjear la recompensa'));
        }

        return data as string;
    }

    async validarCanje(codigo: string): Promise<string> {
        const { data, error } = await this.s.rpc('validar_canje', { p_codigo: codigo });

        if (error) {
            throw new Error(this.traducirError(error.message, this.ERRORES_VALIDACION, 'Error al conectar con el servidor.'));
        }

        return data as string;
    }

    private traducirError(mensaje: string, equivalencias: Record<string, string>, porDefecto: string): string {
        const clave = Object.keys(equivalencias).find(codigo => mensaje.includes(codigo));
        return clave ? equivalencias[clave] : porDefecto;
    }
}