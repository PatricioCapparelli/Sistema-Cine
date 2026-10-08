import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export type PermisoNotificaciones = NotificationPermission | 'no-soportado';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
    private router = inject(Router);

    readonly soportadas = typeof window !== 'undefined' && 'Notification' in window;

    permiso = signal<PermisoNotificaciones>(this.leerPermiso());

    constructor() {
        if (this.soportadas) {
            window.addEventListener('focus', () => this.permiso.set(this.leerPermiso()));
        }
    }

    async pedirPermiso(): Promise<PermisoNotificaciones> {
        if (!this.soportadas) return 'no-soportado';

        if (Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.error('No se pudo pedir el permiso de notificaciones', error);
            }
        }

        this.permiso.set(this.leerPermiso());
        return this.permiso();
    }

    async mostrar(titulo: string, cuerpo: string, etiqueta: string, ruta = '/cartelera'): Promise<boolean> {
        if (!this.soportadas || Notification.permission !== 'granted') return false;

        try {
            const registro = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;

            if (registro) {
                await registro.showNotification(titulo, {
                    body: cuerpo,
                    tag: etiqueta,
                    icon: '/icons/icon-192x192.png',
                    data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: ruta } } }
                });
                return true;
            }

            const notificacion = new Notification(titulo, { body: cuerpo, tag: etiqueta, icon: '/icons/icon-192x192.png' });

            notificacion.onclick = () => {
                window.focus();
                this.router.navigate([ruta]);
                notificacion.close();
            };

            return true;
        } catch (error) {
            console.error('No se pudo mostrar la notificación', error);
            return false;
        }
    }

    private leerPermiso(): PermisoNotificaciones {
        return this.soportadas ? Notification.permission : 'no-soportado';
    }
}