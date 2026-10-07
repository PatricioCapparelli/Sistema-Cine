import { inject, signal, effect, untracked, Service } from '@angular/core';
import { Supabase } from './supabase.service';
import { Auth } from './auth.service';
import { IAviso, IProxima, IPeliculaVista } from '../interfaces/Proxima';
import { NotificacionesService } from './notificaciones.service';

@Service()
export class ProximamenteService {
    private s = inject(Supabase).Supabase;
    private auth = inject(Auth);
    private notificaciones = inject(NotificacionesService);
    private notificados = new Set<number>();

    private readonly INTERVALO_MS = 5 * 60 * 1000;

    avisos = signal<IAviso[]>([]);

    constructor() {
        effect((alLimpiar) => {
            const usuario = this.auth.usuarioActual();

            if (!usuario) {
                untracked(() => {
                    this.avisos.set([]);
                    this.notificados.clear();
                });
                return;
            }

            untracked(() => this.cargarAvisos());

            const temporizador = setInterval(() => this.cargarAvisos(), this.INTERVALO_MS);
            const alVolver = () => {
                if (document.visibilityState === 'visible') this.cargarAvisos();
            };
            document.addEventListener('visibilitychange', alVolver);

            alLimpiar(() => {
                clearInterval(temporizador);
                document.removeEventListener('visibilitychange', alVolver);
            });
        });
    }

    async obtenerProximas(): Promise<IProxima[]> {
        const hoy = new Date().toLocaleDateString('en-CA');
        const { data, error } = await this.s.from('Peliculas')
            .select('id, nombre, imagen_url, genero, fecha_estreno, preventa_activa, precio_preventa, dias_preventa')
            .gt('fecha_estreno', hoy)
            .order('fecha_estreno', { ascending: true });

        if (error) throw new Error('Error al obtener los próximos estrenos');
        return data as IProxima[];
    }

    async obtenerMisAlertas(): Promise<Set<number>> {
        const { data, error } = await this.s.from('Alertas_Peliculas').select('pelicula_id');
        if (error) throw new Error('Error al obtener las alertas');
        return new Set((data || []).map(a => a.pelicula_id));
    }

    async activarAlerta(peliculaId: number): Promise<void> {
        const { error } = await this.s.from('Alertas_Peliculas').insert([{ pelicula_id: peliculaId }]);
        if (error && error.code !== '23505') throw new Error('Error al activar la alerta');
    }

    async quitarAlerta(peliculaId: number): Promise<void> {
        const { error } = await this.s.from('Alertas_Peliculas').delete().eq('pelicula_id', peliculaId);
        if (error) throw new Error('Error al quitar la alerta');
    }

    async cargarAvisos(): Promise<void> {
        const { data, error } = await this.s.rpc('avisos_pendientes');
        if (error) {
            console.error('Error al obtener los avisos', error);
            return;
        }

        const pendientes = (data || []) as IAviso[];

        this.avisos.update(actuales => {
            const ids = new Set(actuales.map(a => a.pelicula_id));
            return [...actuales, ...pendientes.filter(a => !ids.has(a.pelicula_id))];
        });

        let avisados = false;

        for (const aviso of pendientes.filter(a => !this.notificados.has(a.pelicula_id))) {
            const mostrado = this.notificaciones.mostrar(
                'Ya hay entradas a la venta',
                `Ya podés comprar entradas de "${aviso.nombre}".`,
                `pelicula-${aviso.pelicula_id}`
            );

            if (mostrado) {
                this.notificados.add(aviso.pelicula_id);
                avisados = true;
            }
        }

        if (avisados) await this.s.rpc('marcar_avisos_vistos');
    }

    async descartarAvisos(): Promise<void> {
        const { error } = await this.s.rpc('marcar_avisos_vistos');
        if (error) {
            console.error('Error al marcar los avisos', error);
            return;
        }
        this.avisos.set([]);
    }

    async obtenerMisPeliculas(): Promise<IPeliculaVista[]> {
        const { data, error } = await this.s.rpc('mis_peliculas');
        if (error) throw new Error('Error al obtener tu historial');
        return (data || []) as IPeliculaVista[];
    }
}