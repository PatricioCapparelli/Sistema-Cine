import { Component, inject, OnInit, signal } from '@angular/core';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Supabase } from '../../core/services/supabase.service';

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabaseS = inject(Supabase);

  matrizSala = signal<Butaca[][]>([]);
  butacasSeleccionadas = signal<Butaca[]>([]);
  idFuncion = signal<string | null>(null);

  ngOnInit() {
    this.idFuncion.set(this.route.snapshot.paramMap.get('id'));
    this.generarSala();
    this.cargarButacasOcupadas();
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

  private async cargarButacasOcupadas() {
    if (!this.idFuncion()) return;

    try {
      const { data, error } = await this.supabaseS.Supabase
        .from('Ventas') 
        .select('butaca_id')
        .eq('funcion_id', this.idFuncion());

      if (error) throw error;

      if (data && data.length > 0) {
        const ocupadas = data.map(t => t.butaca_id);
        
        this.matrizSala.update(matriz => {
          return matriz.map(fila => 
            fila.map(b => ocupadas.includes(b.id) ? { ...b, estado: 'ocupada' } : b)
          );
        });
      }
    } catch (error) {
      console.error('Error al cargar butacas ocupadas:', error);
    }
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

  async confirmarCompra() {
    if (this.butacasSeleccionadas().length === 0) {
      alert('Debes seleccionar al menos una butaca.');
      return;
    }

    try {
      const datosUsuario = this.sesionCompra.datosUsuario();
      const esAnonimo = this.sesionCompra.esAnonimo();
      
      const totalPagado = this.calcularTotal();
      const cantidadButacas = this.butacasSeleccionadas().length;
      
      const precioPorButaca = totalPagado / cantidadButacas; 

      const ticketsAInsertar = this.butacasSeleccionadas().map(butaca => ({
        funcion_id: this.idFuncion(),
        usuario_id: !esAnonimo && datosUsuario ? datosUsuario.id : null, 
        email_comprador: this.sesionCompra.emailComprador(),
        monto_total: precioPorButaca, 
        butaca_id: butaca.id 
      }));

      const { error: errorVenta } = await this.supabaseS.Supabase
        .from('Ventas') 
        .insert(ticketsAInsertar);

      if (errorVenta) throw errorVenta;

      if (!esAnonimo && datosUsuario && datosUsuario.uso_cupon === false) {
        const { error: errorUsuario } = await this.supabaseS.Supabase
          .from('Usuarios')
          .update({ uso_cupon: true })
          .eq('id', datosUsuario.id);
          
        if (errorUsuario) console.error('Error al actualizar el cupón', errorUsuario);
      }

      alert(`¡Compra exitosa! Total pagado: $${totalPagado}`);
      this.router.navigate(['/cartelera']);

    } catch (error) {
      console.error('Error procesando la compra:', error);
      alert('Hubo un error al procesar tu compra. Revisá la consola.');
    }
  }
}