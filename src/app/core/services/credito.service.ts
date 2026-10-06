import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { Supabase } from './supabase.service';
import { Auth } from './auth.service';

export interface ICompra {
    venta_id: string;
    comprado_el: string;
    pelicula: string;
    imagen_url: string | null;
    funcion_inicio: string;
    butacas: string;
    total: number;
    usada: boolean;
    cancelada: boolean;
    puede_cancelar: boolean;
}

@Injectable({ providedIn: 'root' })
export class CreditoService {
    private s = inject(Supabase).Supabase;
    private auth = inject(Auth);

    private readonly ERRORES: Record<string, string> = {
        FUERA_DE_PLAZO: 'FUERA_DE_PLAZO',
        ENTRADA_USADA: 'ENTRADA_USADA',
        YA_CANCELADA: 'YA_CANCELADA',
        COMPRA_NO_ENCONTRADA: 'COMPRA_NO_ENCONTRADA',
        NO_AUTENTICADO: 'NO_AUTENTICADO'
    };

    saldo = signal(0);

    constructor() {
        effect(() => {
            const usuario = this.auth.usuarioActual();
            untracked(() => (usuario ? this.cargarSaldo() : this.saldo.set(0)));
        });
    }

    async cargarSaldo(): Promise<number> {
        const { data, error } = await this.s.rpc('mi_credito');
        if (error) {
            console.error('Error al obtener el crédito', error);
            return this.saldo();
        }

        const valor = Number(data) || 0;
        this.saldo.set(valor);
        return valor;
    }

    async obtenerCompras(): Promise<ICompra[]> {
        const { data, error } = await this.s.rpc('mis_compras');
        if (error) throw new Error('Error al obtener tus compras');
        return (data || []).map((c: any) => ({ ...c, total: Number(c.total) })) as ICompra[];
    }

    async cancelarCompra(ventaId: string): Promise<number> {
        const { data, error } = await this.s.rpc('cancelar_compra', { p_venta: ventaId });

        if (error) {
            const clave = Object.keys(this.ERRORES).find(codigo => error.message.includes(codigo));
            throw new Error(clave ? this.ERRORES[clave] : 'Error al cancelar la compra');
        }

        await this.cargarSaldo();
        return Number(data) || 0;
    }
}