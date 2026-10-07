import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LogActividadService, ILogActividad, GrupoLog } from '../../core/services/log-actividad.service';

@Component({
  selector: 'app-log-actividad',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './log-actividad.html',
  styleUrl: './log-actividad.css'
})
export class LogActividadComponent implements OnInit {
  private servicio = inject(LogActividadService);

  private ultimaSolicitud = 0;

  readonly TAMANO = 25;

  readonly GRUPOS: { valor: GrupoLog; etiqueta: string }[] = [
    { valor: 'todo', etiqueta: 'Todo' },
    { valor: 'funciones', etiqueta: 'Funciones' },
    { valor: 'precios', etiqueta: 'Precios' },
    { valor: 'validaciones', etiqueta: 'Validaciones' }
  ];

  readonly PERIODOS: { etiqueta: string; dias: number | null }[] = [
    { etiqueta: 'Hoy', dias: 1 },
    { etiqueta: '7 días', dias: 7 },
    { etiqueta: '30 días', dias: 30 },
    { etiqueta: 'Todo', dias: null }
  ];

  private readonly ACCIONES: Record<string, { texto: string; clase: string }> = {
    funcion_creada: { texto: 'Función creada', clase: 'crear' },
    funcion_eliminada: { texto: 'Función eliminada', clase: 'eliminar' },
    precio_modificado: { texto: 'Precio modificado', clase: 'precio' },
    qr_validado: { texto: 'QR validado', clase: 'validar' },
    canje_validado: { texto: 'Canje validado', clase: 'validar' }
  };

  grupo = signal<GrupoLog>('todo');
  periodo = signal<number | null>(7);
  pagina = signal(0);
  filas = signal<ILogActividad[]>([]);
  total = signal(0);
  cargando = signal(true);
  error = signal(false);

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.TAMANO)));
  primero = computed(() => (this.total() === 0 ? 0 : this.pagina() * this.TAMANO + 1));
  ultimo = computed(() => Math.min(this.total(), (this.pagina() + 1) * this.TAMANO));

  async ngOnInit() {
    await this.cargar();
  }

  async cambiarGrupo(grupo: GrupoLog) {
    this.grupo.set(grupo);
    this.pagina.set(0);
    await this.cargar();
  }

  async cambiarPeriodo(dias: number | null) {
    this.periodo.set(dias);
    this.pagina.set(0);
    await this.cargar();
  }

  async anterior() {
    if (this.pagina() === 0) return;
    this.pagina.update(p => p - 1);
    await this.cargar();
  }

  async siguiente() {
    if (this.pagina() + 1 >= this.totalPaginas()) return;
    this.pagina.update(p => p + 1);
    await this.cargar();
  }

  async cargar() {
    const solicitud = ++this.ultimaSolicitud;
    this.cargando.set(true);
    this.error.set(false);

    try {
      const resultado = await this.servicio.obtener({
        grupo: this.grupo(),
        desde: this.inicioDelPeriodo(),
        pagina: this.pagina(),
        tamano: this.TAMANO
      });

      if (solicitud !== this.ultimaSolicitud) return;

      this.filas.set(resultado.filas);
      this.total.set(resultado.total);
    } catch (error) {
      console.error('Error al cargar el log', error);
      if (solicitud === this.ultimaSolicitud) this.error.set(true);
    } finally {
      if (solicitud === this.ultimaSolicitud) this.cargando.set(false);
    }
  }

  accion(clave: string) {
    return this.ACCIONES[clave] ?? { texto: clave, clase: 'otra' };
  }

  private inicioDelPeriodo(): Date | null {
    const dias = this.periodo();
    if (dias === null) return null;

    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (dias - 1));
    return desde;
  }
}