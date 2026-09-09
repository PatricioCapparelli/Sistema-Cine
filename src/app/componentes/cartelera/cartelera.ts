import { Component, inject, OnInit, signal } from '@angular/core'; 
import { Supabase } from '../../core/services/supabase.service'; 
import { Pelicula } from '../pelicula/pelicula'; 

@Component({
  selector: 'app-cartelera',
  standalone: true,
  imports: [Pelicula],
  styleUrl: './cartelera.css',
  templateUrl: './cartelera.html',
})
export class Cartelera implements OnInit {
  private supabaseS = inject(Supabase);

  carteleraAgrupada = signal<any[]>([]); 
  cargando = signal(true);

  async ngOnInit() {
    await this.cargarCartelera();
  }

  async cargarCartelera() {
    try {
      const ahora = new Date().toISOString();

      const { data: funciones, error } = await this.supabaseS.Supabase
        .from('Funciones')
        .select(`
          id,
          fecha_hora_inicio,
          formato_visual,
          formato_audio,
          Peliculas (*),
          Salas (nombre)
        `)
        .gte('fecha_hora_inicio', ahora)
        .order('fecha_hora_inicio', { ascending: true });

      if (error) throw error;

      const agrupado = this.agruparPorPelicula(funciones || []);
      this.carteleraAgrupada.set(agrupado);
      
    } catch (error) {
      console.error('Error cargando la cartelera:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  private agruparPorPelicula(funcionesAbiertas: any[]) {
    const mapa = new Map();

    for (const func of funcionesAbiertas) {
      const idPeli = func.Peliculas.id;
      
      if (!mapa.has(idPeli)) {
        mapa.set(idPeli, { pelicula: func.Peliculas, horarios: [] });
      }
      
      mapa.get(idPeli).horarios.push({
        idFuncion: func.id,
        hora: func.fecha_hora_inicio,
        sala: func.Salas.nombre,
        visual: func.formato_visual,
        audio: func.formato_audio
      });
    }

    return Array.from(mapa.values());
  }
}