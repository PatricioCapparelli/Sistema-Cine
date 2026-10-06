import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CreditoService, ICompra } from '../../core/services/credito.service';

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mis-compras.html',
  styleUrl: './mis-compras.css'
})
export class MisComprasComponent implements OnInit {
  private servicio = inject(CreditoService);

  private readonly MENSAJES: Record<string, string> = {
    FUERA_DE_PLAZO: 'Ya pasó el plazo: solo se puede cancelar hasta 2 horas antes de la función.',
    ENTRADA_USADA: 'Esta entrada ya fue utilizada.',
    YA_CANCELADA: 'Esta compra ya estaba cancelada.',
    COMPRA_NO_ENCONTRADA: 'No encontramos esa compra.',
    NO_AUTENTICADO: 'Tu sesión venció. Volvé a iniciar sesión.'
  };

  saldo = this.servicio.saldo;
  compras = signal<ICompra[]>([]);
  cargando = signal(true);
  error = signal(false);
  cancelando = signal<string | null>(null);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    try {
      this.compras.set(await this.servicio.obtenerCompras());
      this.error.set(false);
    } catch (error) {
      console.error(error);
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  limite(compra: ICompra): Date {
    const limite = new Date(compra.funcion_inicio);
    limite.setHours(limite.getHours() - 2);
    return limite;
  }

  async cancelar(compra: ICompra) {
    if (this.cancelando()) return;

    const aviso = `¿Cancelar esta compra? Se acreditarán $${compra.total} de crédito en tu cuenta para futuras compras. No se devuelve dinero.`;
    if (!confirm(aviso)) return;

    this.cancelando.set(compra.venta_id);
    try {
      const credito = await this.servicio.cancelarCompra(compra.venta_id);
      alert(`Compra cancelada. Se acreditaron $${credito} de crédito.`);
    } catch (error: any) {
      alert(this.MENSAJES[error.message] ?? 'No se pudo cancelar la compra.');
    } finally {
      this.cancelando.set(null);
    }

    await this.cargar();
  }
}