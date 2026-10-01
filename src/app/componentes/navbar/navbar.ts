import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../core/services/auth.service';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  public authS = inject(Auth);

  @HostListener('document:click', ['$event'])
  cerrarMenus(evento: Event) {
    this.host.nativeElement.querySelectorAll('details[open]').forEach(menu => {
      if (!menu.contains(evento.target as Node)) menu.removeAttribute('open');
    });
  }

  async cerrarSesion() {
    try {
      await this.authS.cerrarSesion();
    } catch (error) {
      console.error('Error al cerrar sesion', error);
    }
  }
}