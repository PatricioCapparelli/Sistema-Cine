import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supabase } from '../../core/services/supabase.service';
import { FuncionesService } from '../../core/services/funciones.service';

@Component({
  selector: 'app-abm-funciones',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './abm-funciones.html',
  styleUrl: './abm-funciones.css' 
})
export class AbmFuncionesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabaseS = inject(Supabase);
  private s = this.supabaseS.Supabase;
  private funcionesService = inject(FuncionesService);

  peliculas: any[] = [];

  formulario = this.fb.group({
    pelicula_id: ['', Validators.required],
    fecha_hora_inicio: ['', Validators.required],
    formato_visual: ['', Validators.required],
    formato_audio: ['', Validators.required]
  });

  async ngOnInit() {
    await this.cargarPeliculas();
  }

  async cargarPeliculas() {
    const { data } = await this.s.from('Peliculas').select('id, nombre');
    this.peliculas = data || [];
  }

  async guardarFuncion() {
    if (this.formulario.invalid) {
      alert('Por favor, complete todos los campos.');
      return;
    }

    const formData = this.formulario.value;
    const horariosSolicitados = [formData.fecha_hora_inicio!];

    try {
      await this.funcionesService.programarFuncionesAutomaticas(
        formData.pelicula_id!.toString(),
        horariosSolicitados,
        formData.formato_visual!,
        formData.formato_audio!
      );
      
      alert('Funcion programada con exito. El sistema asigno una sala disponible automaticamente.');
      this.formulario.reset();
      
    } catch (error: any) {
      console.error('Error al procesar la función:', error);
      alert(error.message || 'Hubo un error de conexion al intentar guardar.');
    }
  }

  async borrarFuncion(idFuncion: number) {
    if(confirm('Estas seguro de que queres eliminar esta funcion?')) {
      try {
        await this.funcionesService.eliminarFuncion(idFuncion);
        alert('Función eliminada con éxito.');
      } catch (error) {
        console.error(error);
        alert('Hubo un error al eliminar la funcion.');
      }
    }
  }
}