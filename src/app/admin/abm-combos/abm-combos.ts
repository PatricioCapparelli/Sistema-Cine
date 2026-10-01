import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CombosService } from '../../core/services/combos.service';
import { ICombo } from '../../core/interfaces/Combo';

@Component({
  selector: 'app-abm-combos',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './abm-combos.html',
  styleUrl: './abm-combos.css'
})
export class AbmCombosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private combosService = inject(CombosService);

  combos = signal<ICombo[]>([]);
  editandoId = signal<string | null>(null);
  guardando = signal(false);

  formulario = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    imagen_url: [''],
    precio: [0, [Validators.required, Validators.min(1)]]
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    try {
      this.combos.set(await this.combosService.obtener(false));
    } catch (error) {
      console.error(error);
      alert('No se pudieron cargar los combos.');
    }
  }

  editar(combo: ICombo) {
    this.editandoId.set(combo.id);
    this.formulario.setValue({
      nombre: combo.nombre,
      descripcion: combo.descripcion ?? '',
      imagen_url: combo.imagen_url ?? '',
      precio: combo.precio
    });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.formulario.reset({ nombre: '', descripcion: '', imagen_url: '', precio: 0 });
  }

  async guardar() {
    if (this.formulario.invalid || this.guardando()) return;

    const { nombre, descripcion, imagen_url, precio } = this.formulario.getRawValue();
    const datos = {
      nombre: (nombre ?? '').trim(),
      descripcion: (descripcion ?? '').trim() || null,
      imagen_url: (imagen_url ?? '').trim() || null,
      precio: Math.round(Number(precio))
    };

    if (!datos.nombre) return;

    this.guardando.set(true);
    try {
      const id = this.editandoId();
      if (id) {
        await this.combosService.actualizar(id, datos);
      } else {
        await this.combosService.crear(datos);
      }
      this.cancelarEdicion();
      await this.cargar();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el combo.');
    } finally {
      this.guardando.set(false);
    }
  }

  async alternar(combo: ICombo, campo: 'activo' | 'destacado') {
    try {
      await this.combosService.actualizar(combo.id, { [campo]: !combo[campo] });
      await this.cargar();
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el combo.');
    }
  }

  async eliminar(combo: ICombo) {
    if (!confirm(`¿Eliminar el combo "${combo.nombre}"?`)) return;

    try {
      await this.combosService.eliminar(combo.id);
      await this.cargar();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el combo.');
    }
  }
}