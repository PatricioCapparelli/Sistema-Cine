import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

interface EventoInstalacion extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
    private actualizaciones = inject(SwUpdate);

    private eventoInstalacion: EventoInstalacion | null = null;

    hayActualizacion = signal(false);
    puedeInstalar = signal(false);
    enLinea = signal(navigator.onLine);
    instalada = signal(this.estaInstalada());

    constructor() {
        window.addEventListener('online', () => this.enLinea.set(true));
        window.addEventListener('offline', () => this.enLinea.set(false));

        window.addEventListener('beforeinstallprompt', evento => {
            evento.preventDefault();
            this.eventoInstalacion = evento as EventoInstalacion;
            this.puedeInstalar.set(true);
        });

        window.addEventListener('appinstalled', () => {
            this.eventoInstalacion = null;
            this.puedeInstalar.set(false);
            this.instalada.set(true);
        });

        if (!this.actualizaciones.isEnabled) return;

        this.actualizaciones.versionUpdates
            .pipe(filter((evento): evento is VersionReadyEvent => evento.type === 'VERSION_READY'))
            .subscribe(() => this.hayActualizacion.set(true));

        this.actualizaciones.unrecoverable.subscribe(() => document.location.reload());

        setInterval(() => this.actualizaciones.checkForUpdate().catch(() => false), 60 * 60 * 1000);
    }

    async instalar(): Promise<void> {
        const evento = this.eventoInstalacion;
        if (!evento) return;

        await evento.prompt();
        await evento.userChoice;

        this.eventoInstalacion = null;
        this.puedeInstalar.set(false);
    }

    async actualizar(): Promise<void> {
        try {
            await this.actualizaciones.activateUpdate();
        } finally {
            document.location.reload();
        }
    }

    private estaInstalada(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    }
}