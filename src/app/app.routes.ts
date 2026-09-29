import { Routes } from '@angular/router';
import { publicRoutes } from './public/public.routes';
import { logueadoGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { compraGuard } from './core/guards/compra.guard';
import { empleadoGuard } from './core/guards/empleado.guard';

export const routes: Routes = [
    ...publicRoutes,
    {
        path: 'admin/peliculas',
        canActivate: [logueadoGuard, adminGuard],
        loadComponent: () => import('./admin/abm-peliculas/abm-peliculas').then(m => m.AbmPeliculasComponent)
    },
    {
        path: 'admin/funciones',
        canActivate: [logueadoGuard, adminGuard],
        loadComponent: () => import('./admin/abm-funciones/abm-funciones').then((m) => m.AbmFuncionesComponent)
    },
    {
        path: 'admin/promociones',
        canActivate: [logueadoGuard, adminGuard], 
        loadComponent: () => import('./admin/abm-promociones/abm-promociones').then(m => m.AbmPromocionesComponent)
    },
    {
        path: 'admin/candy',
        canActivate: [logueadoGuard, adminGuard], 
        loadComponent: () => import('./admin/abm-candy/abm-candy').then(m => m.AbmCandyComponent)
    },
    {
        path: 'admin/usuarios',
        canActivate: [logueadoGuard, adminGuard], 
        loadComponent: () => import('./admin/abm-usuarios/abm-usuarios').then(m => m.AbmUsuariosComponent)
    },
    {
        path: 'escaner',
        canActivate: [logueadoGuard, empleadoGuard], 
        loadComponent: () => import('./componentes/escaner-qr/escaner-qr').then(m => m.EscanerQrComponent) 
    },
    {
        path: 'comprar/:id',
        canActivate: [compraGuard],
        loadComponent: () => import('./componentes/butacas/butacas').then(m => m.Butacas)
    },
    {
        path: 'candy',
        canActivate: [compraGuard],
        loadComponent: () => import('./componentes/candy/candy').then(m => m.Candy)
    },

    { path: '', redirectTo: 'cartelera', pathMatch: 'full' },
    { path: '**', redirectTo: 'cartelera' }
];