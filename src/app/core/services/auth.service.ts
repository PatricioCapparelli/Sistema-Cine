import { inject, signal, WritableSignal, Service } from '@angular/core';
import { IAuthData, IUsuario } from '../interfaces/Usuario';
import { Supabase } from './supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Service()
export class Auth {
    private supabaseS = inject(Supabase);
    private routerS = inject(Router);
    private s = this.supabaseS.Supabase

    public usuarioActual: WritableSignal<User | null> = signal<User | null>(null);
    public rolActual: WritableSignal<string | null> = signal<string | null>(null);
    public perfilActual: WritableSignal<IUsuario | null> = signal<IUsuario | null>(null);

    constructor() {
        this.s.auth.onAuthStateChange(async (event, session) => {
            setTimeout(async () => {
                if (session?.user) {
                    this.usuarioActual.set(session.user);

                    const { data, error } = await this.supabaseS.Supabase
                        .from('Usuarios')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (!error && data) {
                        this.rolActual.set(data.rol);
                        this.perfilActual.set(data as IUsuario);
                    } else {
                        this.rolActual.set('cliente');
                        this.perfilActual.set(null);
                    }
                } else {
                    this.usuarioActual.set(null);
                    this.rolActual.set(null);
                    this.perfilActual.set(null);
                }
            }
                , 0);
        });
    }


    public async registrar(usuario: IAuthData) {
        const respuesta = await this.s.auth.signUp({
            email: usuario.email,
            password: usuario.password
        });

        if (respuesta.error) throw respuesta.error;

        if (respuesta.data.user) {
            const nuevoUsuario: IUsuario = {
                id: respuesta.data.user.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                fecha_nacimiento: usuario.fecha_nacimiento,
                tipo_sangre: usuario.tipo_sangre,
                color_ojos: usuario.color_ojos,
                dias_vacaciones: usuario.dias_vacaciones,
                uso_cupon: false,
                rol: 'cliente'
            };

            const { error: dbError } = await this.supabaseS.Supabase
                .from('Usuarios')
                .insert([nuevoUsuario]);

            if (dbError) throw dbError;
        }

        return respuesta.data;
    }

    async loguear(usuario: Pick<IAuthData, 'email' | 'password'>) {
        const { data, error } = await this.s.auth.signInWithPassword({
            email: usuario.email,
            password: usuario.password!,
        });

        if (error) throw error;

        return data;
    }

    async cerrarSesion() {
        const { error } = await this.s.auth.signOut();
        if (error) throw error;

        this.routerS.navigateByUrl('/cartelera');
    }

    async obtenerTodosLosUsuarios() {
        const { data, error } = await this.s.from('Usuarios')
            .select('id, apellido, nombre, rol')
            .order('rol', { ascending: true });

        if (error) throw new Error('Error al cargar los usuarios');
        return data;
    }

    async cambiarRolUsuario(idUsuario: string, nuevoRol: string) {
        const { error } = await this.s.from('Usuarios')
            .update({ rol: nuevoRol })
            .eq('id', idUsuario);

        if (error) {
            console.error('Error de Supabase al cambiar rol:', error);
            throw error;
        }
    }
}