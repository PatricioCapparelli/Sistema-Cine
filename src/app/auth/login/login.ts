import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../core/services/auth.service'; 
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html', 
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private authS = inject(Auth);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async ingresar() {
    if (this.loginForm.valid) {
      try {
        await this.authS.loguear(this.loginForm.value as any);
      } catch (error) {
        console.error('Error al iniciar sesión', error);
        alert('Credenciales inválidas o error.');
      }
    }
  }
}