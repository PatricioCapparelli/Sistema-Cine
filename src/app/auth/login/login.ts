import { Component, inject, OnInit, signal, isDevMode } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { Auth } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sesionCompra = inject(SesionCompraService);
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  readonly modoDesarrollo = isDevMode();
  private readonly CUENTA_DEMO_ADMIN = {
    email: 'admin@hotmail.com',
    password: 'Admin123!'
  };


  edadMinima = signal(0);
  idFuncion = signal<string | null>(null);
  mostrarInputAnonimo = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  emailAnonimoControl = new FormControl('', [Validators.required, Validators.email]);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['funcionId']) {
        this.idFuncion.set(params['funcionId']);
      }
      this.edadMinima.set(Number(params['edadMinima']) || 0);
    });
  }

  rellenarAdmin() {
  this.loginForm.patchValue(this.CUENTA_DEMO_ADMIN);
  this.loginForm.markAsDirty();
}

  async iniciarSesion() {
    if (this.loginForm.valid) {
      try {
        const credenciales = {
          email: this.loginForm.value.email,
          password: this.loginForm.value.password
        };

        await this.auth.loguear(credenciales);

        setTimeout(() => {
          this.ejecutarRedireccion();
        }, 500);

      } catch (error) {
        console.error('Error de autenticación:', error);
        alert('Credenciales incorrectas. Intentá nuevamente.');
      }
    }
  }

  continuarComoAnonimo() {
    if (this.edadMinima() > 0) {
      alert(`Las películas +${this.edadMinima()} no se pueden comprar como invitado. Iniciá sesión.`);
      return;
    }
    if (this.emailAnonimoControl.valid) {
      this.sesionCompra.iniciarComoAnonimo(this.emailAnonimoControl.value!);
      this.ejecutarRedireccion();
    }
  }

  private ejecutarRedireccion() {
    const id = this.idFuncion();
    if (id) {
      this.router.navigate(['/comprar', id]);
    } else {
      this.router.navigate(['/']);
    }
  }
}