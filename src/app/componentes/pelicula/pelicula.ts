import { Component, input } from '@angular/core';
import { IPelicula } from '../../core/interfaces/Pelicula';

@Component({
  imports: [],
  selector: 'app-pelicula',
  styleUrl: './pelicula.css',
  templateUrl: './pelicula.html',
})
export class Pelicula {
  peliculaInput = input<IPelicula>();
}
