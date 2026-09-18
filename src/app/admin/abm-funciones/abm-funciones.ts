import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supabase } from '../../core/services/supabase.service';
import { IFuncion } from '../../core/interfaces/Funcion';
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
  private s = this.supabaseS.Supabase
  private funcionesService = inject(FuncionesService)

  peliculas: any[] = [];
  salas: any[] = [];

  formulario = this.fb.group({
    pelicula_id: ['', Validators.required],
    sala_id: ['', Validators.required],
    fecha_hora_inicio: ['', Validators.required],
    formato_visual: ['', Validators.required],
    formato_audio: ['', Validators.required]
  });

  async ngOnInit() {
    await this.cargarPeliculas();
    await this.cargarSalas();
  }

  async cargarPeliculas() {
    const { data } = await this.s.from('Peliculas').select('id, nombre');
    this.peliculas = data || [];
  }

  async cargarSalas() {
    const { data } = await this.s.from('Salas').select('id, nombre');
    this.salas = data || [];
  }

  async guardarFuncion() {
    if (this.formulario.invalid) {
      alert('Por favor, complete todos los campos.');
      return;
    }

    const formData = this.formulario.value;

    const nuevaFuncion: IFuncion = {
      pelicula_id: Number(formData.pelicula_id),
      sala_id: Number(formData.sala_id),
      fecha_hora_inicio: formData.fecha_hora_inicio!,
      formato_visual: formData.formato_visual!,
      formato_audio: formData.formato_audio!
    };

    try {
      await this.funcionesService.guardarFuncion(nuevaFuncion);
      
      alert('¡Funcion agregada con exito a la cartelera!');
      this.formulario.reset();
      
    } catch (error: any) {
      if (error.message === 'CONFLICTO_HORARIO') {
        alert('Error: El horario choca con otra funcion en esta sala o no respeta los 30 minutos de limpieza.');
      } else {
        console.error('Error al procesar la funcion:', error);
        alert('Hubo un error de conexión al intentar guardar.');
      }
    }
  }

  async borrarFuncion(idFuncion: number) {
    if(confirm('¿Estas seguro de que queres eliminar esta funcion?')) {
      try {
        await this.funcionesService.eliminarFuncion(idFuncion);
        alert('Función eliminada con exito.');
      } catch (error) {
        console.error(error);
        alert('Hubo un error al eliminar la funcion.');
      }
    }
  }
}