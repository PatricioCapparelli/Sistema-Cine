import { inject, signal, WritableSignal, Service } from '@angular/core';
import { IAuthData, IUsuario } from '../interfaces/Usuario';
import { Supabase } from './supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Service()
export class Auth {
    private supabaseS = inject(Supabase);
    private routerS = inject(Router);

    public usuarioActual: WritableSignal<User | null> = signal<User | null>(null);
    public rolActual: WritableSignal<string | null> = signal<string | null>(null);

    constructor() {
        this.supabaseS.Supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                this.usuarioActual.set(session.user);
                
                const { data, error } = await this.supabaseS.Supabase
                    .from('Usuarios')
                    .select('rol')
                    .eq('id', session.user.id)
                    .maybeSingle();
                
                if (!error && data) {
                    this.rolActual.set(data.rol);
                } else {
                    this.rolActual.set('cliente'); 
                }

            } else {
                this.usuarioActual.set(null);
                this.rolActual.set(null);
            }
        });
    }

    public async registrar(usuario: IAuthData) {
        const respuesta = await this.supabaseS.Supabase.auth.signUp({
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

        this.routerS.navigateByUrl('/cartelera');
        return respuesta.data;
    }

    async loguear(usuario: Pick<IAuthData, 'email' | 'password'>) {
        const { data, error } = await this.supabaseS.Supabase.auth.signInWithPassword({
            email: usuario.email,
            password: usuario.password!,
        });

        if (error) throw error;

        this.routerS.navigateByUrl('/cartelera');
        return data;
    }

    async cerrarSesion() {
        const { error } = await this.supabaseS.Supabase.auth.signOut();
        if (error) throw error;

        this.routerS.navigateByUrl('/cartelera');
    }
}