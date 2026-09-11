import { Component, inject, OnInit, signal } from '@angular/core';
import { SesionCompraService } from '../../core/services/sesion-compra.service';

export interface Butaca {
  id: string; 
  fila: string; 
  numero: number; 
  estado: 'libre' | 'seleccionada' | 'ocupada';
}

@Component({
  selector: 'app-butacas',
  standalone: true,
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit {
  private sesionCompra = inject(SesionCompraService);

  matrizSala = signal<Butaca[][]>([]);
  butacasSeleccionadas = signal<Butaca[]>([]);

  ngOnInit() {
    this.generarSala();
  }

  private generarSala() {
    const abecedario = 'ABCDEFGHIJKLMNOPQRST';
    const nuevaMatriz: Butaca[][] = [];

    for (let i = 0; i < 20; i++) {
      const letraFila = abecedario[i];
      const butacasFila: Butaca[] = [];

      for (let j = 1; j <= 28; j++) {
        butacasFila.push({
          id: `${letraFila}-${j}`,
          fila: letraFila,
          numero: j,
          estado: 'libre' 
        });
      }
      nuevaMatriz.push(butacasFila);
    }

    this.matrizSala.set(nuevaMatriz);
  }

  seleccionarButaca(butaca: Butaca) {
    if (butaca.estado === 'ocupada') return; 

    butaca.estado = butaca.estado === 'libre' ? 'seleccionada' : 'libre';

    if (butaca.estado === 'seleccionada') {
      this.butacasSeleccionadas.update(actuales => [...actuales, butaca]);
    } else {
      this.butacasSeleccionadas.update(actuales => 
        actuales.filter(b => b.id !== butaca.id)
      );
    }
  }


  calcularTotal(): number {
    const cantidad = this.butacasSeleccionadas().length;
    const precioTotal = cantidad * this.sesionCompra.precioBaseEntrada;
    const descuento = this.sesionCompra.descuentoAplicado();

    return precioTotal - (precioTotal * (descuento / 100));
  }
  
  obtenerDescuento(): number {
    return this.sesionCompra.descuentoAplicado();
  }
}