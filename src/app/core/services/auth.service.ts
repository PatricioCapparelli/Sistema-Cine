import { inject, signal, WritableSignal, Service } from '@angular/core';
import { IAuthData} from '../interfaces/Usuario';
import { Supabase } from './supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Service()
export class Auth {
    private supabaseS = inject(Supabase);
    private routerS = inject(Router);

    public usuarioActual: WritableSignal<User | null> = signal<User | null>(null);

    constructor() {
        this.supabaseS.Supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                this.usuarioActual.set(session.user);
            } else {
                this.usuarioActual.set(null);
            }
        });
    }

    public async registrar(usuario: IAuthData) {
        const respuesta = await this.supabaseS.Supabase.auth.signUp({
            email: usuario.email,
            password: usuario.password,
            options: {
                data: {
                    nombre: usuario.nombre,
                },
            },
        });

        if (respuesta.error) throw respuesta.error;

        this.routerS.navigateByUrl('/cartelera');
        return respuesta.data;
    }

    async loguear(usuario: IAuthData) {
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