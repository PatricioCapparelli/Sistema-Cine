import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../core/services/auth.service';
import { IAuthData } from '../../core/interfaces/Usuario';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);

  registroForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    fecha_nacimiento: ['', Validators.required],
    tipo_sangre: ['', Validators.required],
    color_ojos: ['', Validators.required],
    dias_vacaciones: [0, [Validators.required, Validators.min(0)]]
  });

  async registrar() {
    if (this.registroForm.valid) {
      try {
        const nuevoUsuario = this.registroForm.value as IAuthData;
        await this.authService.registrar(nuevoUsuario);
        
        alert('Registro exitoso! Ya puedes iniciar sesion.');
        this.registroForm.reset();
      } catch (error) {
        console.error('Error en el registro', error);
        alert('Error al registrar el usuario.');
      }
    }
  }
}