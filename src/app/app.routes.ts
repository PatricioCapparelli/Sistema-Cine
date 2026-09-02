import { Routes } from '@angular/router';
import { logueadoGuard } from './core/guards/logueado.guard'; 

export const routes: Routes = [
    {
        path: 'public',
        loadChildren: () => import('./public/public.routes').then((m) => m.pub)
    },
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
        canActivate: [logueadoGuard] 
    },
    {
        path: 'reserva',
        loadChildren: () => import('./reserva/reserva.routes').then(m => m.reservaRoutes)
    },
    {
        path: '',
        redirectTo: 'public', 
        pathMatch: 'full'
    }
];