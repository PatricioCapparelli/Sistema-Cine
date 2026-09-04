import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth.service';

export const logueadoGuard: CanActivateFn = (route, state) => {
    console.log(route, state);
    const router = inject(Router);
    const authS = inject(Auth);

    if (authS.usuarioActual() !== null) {
        return true;
    }

    return router.createUrlTree(['/auth/login']);
};