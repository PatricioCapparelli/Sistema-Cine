import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supabase } from '../../core/services/supabase.service';
import { IFuncion } from '../../core/interfaces/Funcion';

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
    const { data } = await this.supabaseS.Supabase.from('Peliculas').select('id, nombre');
    this.peliculas = data || [];
  }

  async cargarSalas() {
    const { data } = await this.supabaseS.Supabase.from('Salas').select('id, nombre');
    this.salas = data || [];
  }

  async guardarFuncion() {
    if (this.formulario.invalid) {
      alert('Por favor, complete todos los campos.');
      return;
    }

    const formData = this.formulario.value;
    const inicioNueva = new Date(formData.fecha_hora_inicio!);

    try {
      const { data: peliData, error: errPeli } = await this.supabaseS.Supabase
        .from('Peliculas')
        .select('duracion_minutos')
        .eq('id', formData.pelicula_id)
        .single();

      if (errPeli) throw errPeli;

      // Calculamos cuánto tiempo va a ocupar esta sala (Duración + 30 min extra)
      const duracionNuevaPeli = peliData.duracion_minutos;
      // Multiplicamos por 60000 para pasar los minutos a milisegundos
      const finNueva = new Date(inicioNueva.getTime() + (duracionNuevaPeli + 30) * 60000);

      //Traer todas las funciones que ya existen en ESA SALA
      // Magia de Supabase: Hacemos un "Join" para traer también la duración de esas películas
      const { data: funcionesExistentes, error: errFunciones } = await this.supabaseS.Supabase
        .from('Funciones')
        .select('fecha_hora_inicio, Peliculas(duracion_minutos)')
        .eq('sala_id', formData.sala_id);

      if (errFunciones) throw errFunciones;

      
      let hayConflicto = false; // colision de horarios

      if (funcionesExistentes) {
        for (const func of funcionesExistentes) {
          const inicioExistente = new Date(func.fecha_hora_inicio);
          const duracionExistente = (func.Peliculas as any).duracion_minutos;
          const finExistente = new Date(inicioExistente.getTime() + (duracionExistente + 30) * 60000);

          if (inicioNueva < finExistente && inicioExistente < finNueva) {
            hayConflicto = true;
            break; 
          }
        }
      }

      if (hayConflicto) {
        alert('Error: El horario choca con otra funcion en esta sala o no respeta los 30 minutos de limpieza.');
        return; 
      }

      const nuevaFuncion: IFuncion = {
        pelicula_id: Number(formData.pelicula_id),
        sala_id: Number(formData.sala_id),
        fecha_hora_inicio: formData.fecha_hora_inicio!,
        formato_visual: formData.formato_visual!,
        formato_audio: formData.formato_audio!
      };

      const { error: errInsert } = await this.supabaseS.Supabase
        .from('Funciones')
        .insert([nuevaFuncion]);

      if (errInsert) throw errInsert;

      alert('Funcion agregada con exito a la cartelera!');
      this.formulario.reset();

    } catch (error) {
      console.error('Error al procesar la funcion:', error);
      alert('Hubo un error de conexión al intentar guardar.');
    }
  }
}