import { Component, inject, OnInit, signal } from '@angular/core';
import { Auth } from '../../core/services/auth.service';

@Component({
  selector: 'app-abm-usuarios',
  standalone: true,
  templateUrl: './abm-usuarios.html',
  styleUrl: './abm-usuarios.css'
})
export class AbmUsuariosComponent implements OnInit {
  private authService = inject(Auth);

  listaUsuarios = signal<any[]>([]);

  async ngOnInit() {
    await this.cargarUsuarios();
  }

  async cargarUsuarios() {
    try {
      const usuarios = await this.authService.obtenerTodosLosUsuarios();
      this.listaUsuarios.set(usuarios);
    } catch (error) {
      console.error(error);
    }
  }

  async actualizarRol(id: string, nuevoRol: string) {
    if(confirm(`Estas seguro de cambiar el rol a ${nuevoRol}?`)) {
      try {
        await this.authService.cambiarRolUsuario(id, nuevoRol);
        alert('Rol actualizado con exito.');
        await this.cargarUsuarios(); 
      } catch (error) {
        alert('Hubo un error al cambiar el rol.');
        console.error(error);
      }
    }
  }
}