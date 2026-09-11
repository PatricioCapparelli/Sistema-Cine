import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PromocionesService } from '../../core/services/promociones.service';

@Component({
  selector: 'app-abm-promociones',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './abm-promociones.html',
  styleUrl: './abm-promociones.css'
})
export class AbmPromocionesComponent implements OnInit {

  private promocionesService = inject(PromocionesService);
  private fb = inject(FormBuilder);

  listaPromociones = signal<any[]>([]);
  modoEdicion = signal<boolean>(false);

  promoForm: FormGroup = this.fb.group({
    id: [null],
    codigo_interno: ['', [Validators.required, Validators.minLength(3)]],
    porcentaje_descuento: [0, [Validators.required, Validators.min(1), Validators.max(100)]],
    activo: [true]
  });

  async ngOnInit() {
    await this.cargarTabla();
  }

  async cargarTabla() {
    try {
      const data = await this.promocionesService.obtenerTodasLasPromociones();
      this.listaPromociones.set(data || []);
    } catch (error) {
      console.error('Error cargando promociones:', error);
    }
  }

  async guardarFormulario() {
    if (this.promoForm.invalid) return;

    try {
      await this.promocionesService.guardarPromocion(this.promoForm.value);
      
      this.promoForm.reset({ activo: true }); 
      this.modoEdicion.set(false);
      
      await this.cargarTabla(); 
    } catch (error) {
      console.error('Error guardando la promoción:', error);
    }
  }

  editarPromo(promo: any) {
    this.modoEdicion.set(true);
    this.promoForm.patchValue(promo);
  }

  cancelarEdicion() {
    this.modoEdicion.set(false);
    this.promoForm.reset({ activo: true });
  }

  async eliminarPromo(id: number) {
    if (confirm('Ests seguro de eliminar este cupon?')) {
      try {
        await this.promocionesService.eliminarPromocion(id);
        await this.cargarTabla();
      } catch (error) {
        console.error('Error eliminando la promocion:', error);
      }
    }
  }
}