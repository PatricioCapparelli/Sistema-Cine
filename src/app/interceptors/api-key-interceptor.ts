import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../core/services/loading.service';
import { finalize } from 'rxjs';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
    const loadingService = inject(LoadingService);

    loadingService.mostrar();

    return next(req).pipe(
        finalize(() => {
            loadingService.ocultar();
        })
    );
};