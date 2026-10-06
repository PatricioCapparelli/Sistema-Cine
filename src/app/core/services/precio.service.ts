import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PreciosService {
    private s = inject(Supabase).Supabase;
    private pendiente: Promise<void> | null = null;

    precioBase = signal(5000);
    recargoVip = signal(2500);

    cargar(forzar = false): Promise<void> {
        if (forzar || !this.pendiente) {
            this.pendiente = this.consultar();
        }
        return this.pendiente;
    }

    private async consultar(): Promise<void> {
        const { data, error } = await this.s.from('Configuracion')
            .select('clave, valor')
            .in('clave', ['precio_base_entrada', 'recargo_vip']);

        if (error || !data) {
            console.error('Error al cargar los precios', error);
            this.pendiente = null;
            return;
        }

        for (const fila of data) {
            if (fila.clave === 'precio_base_entrada') this.precioBase.set(Number(fila.valor));
            if (fila.clave === 'recargo_vip') this.recargoVip.set(Number(fila.valor));
        }
    }
}