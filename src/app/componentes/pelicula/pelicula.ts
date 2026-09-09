import { Component, input, output } from '@angular/core';
import { IPelicula } from '../../core/interfaces/Pelicula';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-pelicula',
  standalone: true,
  imports: [RouterLink, DatePipe],
  styleUrl: './pelicula.css',
  templateUrl: './pelicula.html',
})
export class Pelicula {
  peliculaInput = input<IPelicula>();
  funcionesInput = input<any[]>([]);
  modoAdmin = input<boolean>(false); 
  eliminarOutput = output<number>(); 

  onEliminar() {
    const peli = this.peliculaInput();
    if (peli && peli.id) {
      this.eliminarOutput.emit(peli.id);
    }
  }
}