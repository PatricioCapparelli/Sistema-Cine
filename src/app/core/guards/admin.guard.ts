import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../../core/services/supabase.service';

export const adminGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const s = inject(Supabase);

    const { data: { session } } = await s.Supabase.auth.getSession();

    if (!session) {
        router.navigateByUrl('/auth/login');
        return false;
    }

    const { data } = await s.Supabase
        .from('Usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    if (data?.rol === 'admin') {
        return true;
    }

    router.navigateByUrl('/cartelera');
    return false;
};