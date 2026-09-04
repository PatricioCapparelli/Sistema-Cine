import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
    {
        path: 'cartelera',
        loadComponent: () => import('../componentes/cartelera/cartelera').then((m) => m.Cartelera)
    },
    {
        path: 'registro',
        loadComponent: () => import('../auth/register/register').then(m => m.Register)
    },
    {
        path: 'login',
        loadComponent: () => import('../auth/login/login').then(m => m.Login)
    }
];