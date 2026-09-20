import { Service, signal } from '@angular/core';

@Service()
export class LoadingService {
    cargando = signal<boolean>(false);

    mostrar() {
        this.cargando.set(true);
    }

    ocultar() {
        this.cargando.set(false);
    }
}