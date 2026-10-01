import { Component, inject, OnInit, signal } from '@angular/core'; 
import { FormsModule } from '@angular/forms'; 
import { Pelicula } from '../pelicula/pelicula'; 
import { FuncionesService } from '../../core/services/funciones.service';
import { PeliculasService } from '../../core/services/peliculas.service'; 
import { RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-cartelera',
  standalone: true,
  imports: [Pelicula, FormsModule], 
  styleUrl: './cartelera.css',
  templateUrl: './cartelera.html',
})
export class Cartelera implements OnInit {
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);

  carteleraAgrupada = signal<any[]>([]); 
  cargando = signal(true);
  mostrarTop3 = signal<boolean>(false);
  carteleraAgrupadaOriginal = signal<any[]>([]); 
  top3 = signal<any[]>([]);
  terminoBusqueda = signal<string>('');

  async ngOnInit() {
    await this.cargarTop3(); 
    await this.cargarCartelera();
  }

  async cargarTop3() {
    try {
      const data = await this.peliculasService.obtenerTop3Peliculas();
      this.top3.set(data);
    } catch (error) {
      console.error('Error cargando top 3:', error);
    }
  }

  toggleTop3() {
    this.mostrarTop3.update(valor => !valor);
  }

  async cargarCartelera() {
    try {
      const ahora = new Date().toISOString();
      const funciones = await this.funcionesService.obtenerFunciones(ahora);

      const agrupado = this.agruparPorPelicula(funciones || []);
      
      this.carteleraAgrupada.set(agrupado);
      this.carteleraAgrupadaOriginal.set(agrupado);
      
    } catch (error) {
      console.error('Error cargando la cartelera:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  buscar() {
    const termino = this.terminoBusqueda().trim().toLowerCase();
    
    if (!termino) {
      this.carteleraAgrupada.set(this.carteleraAgrupadaOriginal());
      return;
    }

    const resultados = this.carteleraAgrupadaOriginal().filter(item => {
      const genero = item.pelicula.genero ? item.pelicula.genero.toLowerCase() : '';
      const nombre = item.pelicula.nombre ? item.pelicula.nombre.toLowerCase() : '';
      
      return nombre.includes(termino) || genero.includes(termino);
    });
  
    this.carteleraAgrupada.set(resultados);
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
        sala: func.Salas?.nombre || 'Sala General',
        visual: func.formato_visual,
        audio: func.formato_audio
      });
    }

    return Array.from(mapa.values());
  }
}