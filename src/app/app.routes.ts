import { Routes } from '@angular/router';
import { publicRoutes } from './public/public.routes';
import { logueadoGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    ...publicRoutes,
    {
        path: 'admin/peliculas',
        loadComponent: () => import('./admin/abm-peliculas/abm-peliculas').then(m => m.AbmPeliculasComponent),
        canActivate: [logueadoGuard]
    },
    { path: '', redirectTo: 'cartelera', pathMatch: 'full' },
    { path: '**', redirectTo: 'cartelera' }
];