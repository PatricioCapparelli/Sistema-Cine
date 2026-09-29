import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionCompraService } from '../services/sesion-compra.service';
import { Auth } from '../services/auth.service';
import { FuncionesService } from '../services/funciones.service';

export const compraGuard: CanActivateFn = async (route, state) => {
    const sesionCompra = inject(SesionCompraService);
    const auth = inject(Auth);
    const router = inject(Router);
    const funcionesService = inject(FuncionesService);

    const idFuncion = route.paramMap.get('id');

    if (idFuncion) {
        let edadMinima = 0;
        try {
            const detalle: any = await funcionesService.obtenerDetalleFuncion(idFuncion);
            const peli = Array.isArray(detalle?.Peliculas) ? detalle.Peliculas[0] : detalle?.Peliculas;
            edadMinima = Number(peli?.edad_minima) || 0;
        } catch (error) {
            console.error('compraGuard: no se pudo obtener la edad mínima', error);
            return router.createUrlTree(['/cartelera']);
        }

        if (edadMinima > 0) {
            if (auth.usuarioActual() === null) {
                return router.createUrlTree(['/auth/login'], {
                    queryParams: { funcionId: idFuncion }
                });
            }

            const fecha = auth.perfilActual()?.fecha_nacimiento;
            if (!fecha || calcularEdad(fecha) < edadMinima) {
                return router.createUrlTree(['/cartelera']);
            }
        }
    }

    if (auth.usuarioActual() !== null) {
        return true;
    }

    if (sesionCompra.emailComprador() && sesionCompra.emailComprador() !== '') {
        return true;
    }

    return router.createUrlTree(['/auth/login'], {
        queryParams: { funcionId: idFuncion }
    });
};

function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
}