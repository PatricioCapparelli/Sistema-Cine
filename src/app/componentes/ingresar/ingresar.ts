import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { SesionCompraService } from '../../core/services/sesion-compra.service';

@Component({
  selector: 'app-ingresar',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './ingresar.html',
  styleUrl: './ingresar.css'
})
export class Ingresar implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sesionCompra = inject(SesionCompraService);
  private fb = inject(FormBuilder);

  idFuncion = signal<string | null>(null);
  mostrarInputAnonimo = signal(false);
  
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  emailAnonimoControl = new FormControl('', [Validators.required, Validators.email]);

  ngOnInit() {
    this.idFuncion.set(this.route.snapshot.paramMap.get('id'));
  }

  iniciarSesion() {
    if (this.loginForm.valid) {
      const email = this.loginForm.value.email;
      console.log('Login simulado para:', email);
      
      if (this.idFuncion()) {
        this.router.navigate(['/comprar', this.idFuncion()]);
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }

  continuarComoAnonimo() {
    if (this.emailAnonimoControl.valid && this.idFuncion()) {
      this.sesionCompra.iniciarComoAnonimo(this.emailAnonimoControl.value!);
      this.router.navigate(['/comprar', this.idFuncion()]);
    }
  }
}