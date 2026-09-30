import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FidelizacionService, IRecompensa } from '../../core/services/fidelizacion.service';

@Component({
  selector: 'app-abm-recompensas',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './abm-recompensas.html'
})
export class AbmRecompensasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private fidelizacion = inject(FidelizacionService);

  recompensas = signal<IRecompensa[]>([]);

  formulario = this.fb.group({
    nombre: ['', Validators.required],
    tipo: ['entrada', Validators.required],
    costo_puntos: [500, [Validators.required, Validators.min(1)]]
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    try {
      this.recompensas.set(await this.fidelizacion.obtenerRecompensas(false));
    } catch (error) {
      console.error(error);
    }
  }

  async crear() {
    if (this.formulario.invalid) return;
    const { nombre, tipo, costo_puntos } = this.formulario.value;

    try {
      await this.fidelizacion.crearRecompensa(nombre!, tipo!, Number(costo_puntos));
      this.formulario.reset({ tipo: 'entrada', costo_puntos: 500 });
      await this.cargar();
    } catch (error) {
      console.error(error);
      alert('No se pudo crear la recompensa.');
    }
  }

  async cambiarCosto(recompensa: IRecompensa, valor: string) {
    const costo = Number(valor);
    if (!costo || costo < 1) {
      await this.cargar();
      return;
    }

    try {
      await this.fidelizacion.actualizarRecompensa(recompensa.id, { costo_puntos: costo });
      await this.cargar();
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el costo.');
    }
  }

  async alternarActiva(recompensa: IRecompensa) {
    try {
      await this.fidelizacion.actualizarRecompensa(recompensa.id, { activa: !recompensa.activa });
      await this.cargar();
    } catch (error) {
      console.error(error);
    }
  }
}