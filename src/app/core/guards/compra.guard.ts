import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionCompraService } from '../services/sesion-compra.service';
import { Auth } from '../services/auth.service';

export const compraGuard: CanActivateFn = (route, state) => {
    const sesionCompra = inject(SesionCompraService);
    const auth = inject(Auth);
    const router = inject(Router);

    const idFuncion = route.paramMap.get('id');

    if (auth.usuarioActual() !== null) {
        return true;
    }

    if (sesionCompra.emailComprador() && sesionCompra.emailComprador() !== '') {
        return true;
    }

    router.navigate(['/ingresar', idFuncion]);
    return false;
};