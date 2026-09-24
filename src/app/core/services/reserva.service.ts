import { signal, computed, Service } from '@angular/core';
import { IProductoCandy } from '../interfaces/Candy';
import { Butaca } from '../interfaces/Butaca';

@Service()
export class ReservaService {
    peliculaSeleccionada = signal<any>(null);
    butacasSeleccionadas = signal<Butaca[]>([]);
    idFuncionSeleccionada = signal<string | null>(null);
    detalleFuncion = signal<{ pelicula: string, horario: string, sala: string } | null>(null);
    carritoCandy = signal<{ producto: IProductoCandy, cantidad: number }[]>([]);

    totalCandy = computed(() => {
        return this.carritoCandy().reduce((total, item) =>
            total + (item.producto.precio * item.cantidad), 0);
    });

    agregarAlCarrito(producto: IProductoCandy) {
        const carritoActual = this.carritoCandy();
        const itemExistente = carritoActual.find(item => item.producto.id === producto.id);

        if (itemExistente) {
            itemExistente.cantidad += 1;
            this.carritoCandy.set([...carritoActual]);
        } else {
            this.carritoCandy.set([...carritoActual, { producto, cantidad: 1 }]);
        }
    }
}