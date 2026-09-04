import { Component } from '@angular/core';
import { Pelicula } from '../pelicula/pelicula'; 
import { IPelicula } from '../../core/interfaces/Pelicula';

@Component({
  selector: 'app-cartelera',
  standalone: true,
  imports: [Pelicula], 
  styleUrl: './cartelera.css',
  templateUrl: './cartelera.html',
})
export class Cartelera {
  peliculas: IPelicula[] = [
    {
      id: 1,
      nombre: 'El Padrino',
      sinopsis: 'El envejecido patriarca de una dinastía del crimen organizado transfiere el control a su hijo.',
      imagen_url: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg',
      duracion_min: 175
    },
    {
      id: 2,
      nombre: 'Volver al Futuro',
      sinopsis: 'Un joven es enviado accidentalmente 30 años en el pasado en un DeLorean que viaja en el tiempo.',
      imagen_url: 'https://m.media-amazon.com/images/M/MV5BZmU0M2Y1OGUtZjIxNi00ZjBkLTg1MjgtOWIyNThiZWIwYjRiXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg',
      duracion_min: 116
    }
  ];
}