import { Routes } from '@angular/router';
import { publicRoutes } from './public/public.routes';
import { logueadoGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

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
    { path: '', redirectTo: 'cartelera', pathMatch: 'full' },
    { path: '**', redirectTo: 'cartelera' }
];