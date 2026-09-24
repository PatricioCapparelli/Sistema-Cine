import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth.service';

export const empleadoGuard: CanActivateFn = (route, state) => {
    const authService = inject(Auth);
    const router = inject(Router);
    const rol = authService.rolActual();

    if (rol === 'empleado' || rol === 'admin') {
        return true;
    }

    router.navigate(['/cartelera']);
    return false;
};