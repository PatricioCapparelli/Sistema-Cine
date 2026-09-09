import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth.service'; 

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  public authS = inject(Auth);

  async cerrarSesion() {
    try {
      await this.authS.cerrarSesion();
    } catch (error) {
      console.error('Error al cerrar sesion', error);
    }
  }
}