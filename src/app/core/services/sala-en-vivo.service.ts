import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Supabase } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SalaEnVivoService {
    private s = inject(Supabase).Supabase;
    private canal: RealtimeChannel | null = null;
    private funcionActual: string | null = null;
    private suscrito = false;
    private seleccionActual: string[] = [];
    private readonly clienteId = crypto.randomUUID();

    bloqueadas = signal<Set<string>>(new Set());

    conectar(funcionId: string) {
        if (this.canal && this.funcionActual === funcionId) return;
        this.desconectar();
        this.funcionActual = funcionId;

        const canal = this.s.channel(`sala-${funcionId}`, {
            config: { presence: { key: this.clienteId } }
        });

        canal
            .on('presence', { event: 'sync' }, () => {
                const estado = canal.presenceState<{ butacas: string[] }>();
                const ids = new Set<string>();
                for (const [clave, presencias] of Object.entries(estado)) {
                    if (clave === this.clienteId) continue;
                    presencias.forEach(p => p.butacas.forEach(id => ids.add(id)));
                }
                this.bloqueadas.set(ids);
            })
            .subscribe(status => {
                if (status === 'SUBSCRIBED') {
                    this.suscrito = true;
                    canal.track({ butacas: this.seleccionActual });
                }
            });

        this.canal = canal;
    }

    publicar(butacas: string[]) {
        this.seleccionActual = butacas;
        if (this.canal && this.suscrito) {
            this.canal.track({ butacas });
        }
    }

    desconectar() {
        if (this.canal) this.s.removeChannel(this.canal);
        this.canal = null;
        this.funcionActual = null;
        this.suscrito = false;
        this.seleccionActual = [];
        this.bloqueadas.set(new Set());
    }
}