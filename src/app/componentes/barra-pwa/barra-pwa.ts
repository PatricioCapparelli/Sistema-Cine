import { Component, inject } from '@angular/core';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-barra-pwa',
  standalone: true,
  template: `
    @if (!pwa.enLinea()) {
    <div class="barra sin-conexion" role="status">
      Sin conexión. Para ver la cartelera y comprar necesitás internet.
    </div>
    }

    @if (pwa.hayActualizacion()) {
    <div class="barra actualizacion" role="status">
      <span>Hay una versión nueva de Tosco Cine.</span>
      <button type="button" (click)="pwa.actualizar()">Actualizar</button>
    </div>
    }
  `,
  styles: `
    .barra {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 16px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .sin-conexion {
      background: var(--marron-gris);
      color: var(--crema);
    }

    .actualizacion {
      background: var(--estrellas);
      color: var(--marron-oscuro);
    }

    .actualizacion button {
      padding: 3px 14px;
      background: var(--marron-oscuro);
      color: var(--crema);
      border: none;
      border-radius: 999px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  `
})
export class BarraPwa {
  pwa = inject(PwaService);
}