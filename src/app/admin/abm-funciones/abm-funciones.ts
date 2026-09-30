import { Component, inject, OnInit, signal } from '@angular/core';
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

  private readonly NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  peliculas: any[] = [];

  dias = this.generarDias(10);
  diaSeleccionado = signal<string | null>(null);
  horariosDisponibles = signal<string[]>(['14:00', '16:30', '19:00', '21:30']);
  horariosSeleccionados = signal<string[]>([]);

  formulario = this.fb.group({
    pelicula_id: ['', Validators.required],
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

  puedeGuardar(): boolean {
    return this.formulario.valid && !!this.diaSeleccionado() && this.horariosSeleccionados().length > 0;
  }

  horarioPasado(hora: string): boolean {
    const dia = this.diaSeleccionado();
    return !!dia && new Date(`${dia}T${hora}`) < new Date();
  }

  alternarHorario(hora: string) {
    this.horariosSeleccionados.update(actuales =>
      actuales.includes(hora) ? actuales.filter(h => h !== hora) : [...actuales, hora].sort()
    );
  }

  agregarHorario(hora: string) {
    if (!hora) return;

    if (!this.horariosDisponibles().includes(hora)) {
      this.horariosDisponibles.update(actuales => [...actuales, hora].sort());
    }

    if (!this.horariosSeleccionados().includes(hora)) {
      this.alternarHorario(hora);
    }
  }

  async guardarFuncion() {
    const dia = this.diaSeleccionado();
    const horarios = this.horariosSeleccionados();

    if (!this.puedeGuardar() || !dia) {
      alert('Completá película, formatos, día y al menos un horario.');
      return;
    }

    const inicios = horarios.map(h => `${dia}T${h}`);

    if (inicios.some(inicio => new Date(inicio) < new Date())) {
      alert('Hay horarios que ya pasaron. Desmarcalos o elegí otro día.');
      return;
    }

    const formData = this.formulario.value;

    try {
      await this.funcionesService.programarFuncionesAutomaticas(
        formData.pelicula_id!.toString(),
        inicios,
        formData.formato_visual!,
        formData.formato_audio!
      );

      alert('Funciones programadas con éxito. El sistema asignó una sala disponible a cada una.');
      this.formulario.reset();
      this.horariosSeleccionados.set([]);
    } catch (error: any) {
      console.error('Error al procesar la función:', error);
      alert(error.message || 'Hubo un error de conexion al intentar guardar.');
    }
  }

  async borrarFuncion(idFuncion: number) {
    if (confirm('Estas seguro de que queres eliminar esta funcion?')) {
      try {
        await this.funcionesService.eliminarFuncion(idFuncion);
        alert('Función eliminada con éxito.');
      } catch (error) {
        console.error(error);
        alert('Hubo un error al eliminar la funcion.');
      }
    }
  }

  private formatearFecha(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private generarDias(cantidad: number) {
    return Array.from({ length: cantidad }, (_, i) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      const etiqueta = i === 0
        ? 'Hoy'
        : i === 1
          ? 'Mañana'
          : `${this.NOMBRES_DIA[fecha.getDay()]} ${fecha.getDate()}/${fecha.getMonth() + 1}`;
      return { valor: this.formatearFecha(fecha), etiqueta };
    });
  }
}