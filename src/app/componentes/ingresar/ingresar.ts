import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { SesionCompraService } from '../../core/services/sesion-compra.service';
import { Auth } from '../../core/services/auth.service';
import { Supabase } from '../../core/services/supabase.service';

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
  
  private auth = inject(Auth);
  private supabaseS = inject(Supabase);

  idFuncion = signal<string | null>(null);
  mostrarInputAnonimo = signal(false);
  
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  emailAnonimoControl = new FormControl('', [Validators.required, Validators.email]);

  constructor() {
    effect(() => {
      const usuarioAuth = this.auth.usuarioActual();
      if (usuarioAuth) {
        this.cargarDatosYContinuar(usuarioAuth.id);
      }
    });
  }

  ngOnInit() {
    this.idFuncion.set(this.route.snapshot.paramMap.get('id'));
  }


  private async cargarDatosYContinuar(userId: string) {
    try {
      const { data: usuarioDB, error } = await this.supabaseS.Supabase
        .from('Usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (usuarioDB) {
        usuarioDB.email = this.auth.usuarioActual()?.email; 
        this.sesionCompra.iniciarComoRegistrado(usuarioDB);

        if (this.idFuncion()) {
          this.router.navigate(['/comprar', this.idFuncion()]);
        } else {
          this.router.navigate(['/']);
        }
      }
    } catch (error) {
      console.error('Error al cargar perfil de base de datos:', error);
    }
  }

  async iniciarSesion() {
    if (this.loginForm.valid) {
      try {
        const credenciales = {
          email: this.loginForm.value.email,
          password: this.loginForm.value.password
        };
        
        await this.auth.loguear(credenciales);

      } catch (error) {
        console.error('Error de autenticación:', error);
        alert('Credenciales incorrectas. Intentá nuevamente.');
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