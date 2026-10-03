import { Component, ElementRef, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Auth } from '../../core/services/auth.service';
import { IAuthData } from '../../core/interfaces/Usuario';

type Campo = 'email' | 'password' | 'nombre' | 'apellido' | 'tipo_sangre' | 'color_ojos' | 'dias_vacaciones';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_NOMBRE = /^\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '’-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*\s*$/;

const REQUISITOS_PASSWORD = [
  { texto: 'Al menos 6 caracteres', cumple: (v: string) => v.length >= 6 },
  { texto: 'Una letra minúscula', cumple: (v: string) => /[a-z]/.test(v) },
  { texto: 'Una letra mayúscula', cumple: (v: string) => /[A-Z]/.test(v) },
  { texto: 'Un número', cumple: (v: string) => /[0-9]/.test(v) },
  { texto: 'Un símbolo (por ejemplo ! ? # $)', cumple: (v: string) => /[^A-Za-z0-9]/.test(v) }
];

function passwordFuerte(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  if (!valor) return null;
  return REQUISITOS_PASSWORD.every(r => r.cumple(valor)) ? null : { passwordDebil: true };
}

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
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  readonly TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly COLORES_OJOS = ['Marrón', 'Azul', 'Verde', 'Miel/Avellana', 'Gris', 'Negro', 'Otro'];
  readonly DIAS_VACACIONES = [0, 7, 14, 21, 28];

  private readonly MENSAJES: Record<Campo, Record<string, string>> = {
    email: {
      required: 'Ingresá tu email.',
      email: 'Ingresá un email válido, por ejemplo nombre@dominio.com',
      pattern: 'Ingresá un email válido, por ejemplo nombre@dominio.com'
    },
    password: {
      required: 'Elegí una contraseña.',
      passwordDebil: 'La contraseña todavía no cumple los requisitos.'
    },
    nombre: {
      required: 'Ingresá tu nombre.',
      minlength: 'El nombre tiene que tener al menos 2 letras.',
      pattern: 'Usá solo letras. Se permiten espacios, guiones y apóstrofes.'
    },
    apellido: {
      required: 'Ingresá tu apellido.',
      minlength: 'El apellido tiene que tener al menos 2 letras.',
      pattern: 'Usá solo letras. Se permiten espacios, guiones y apóstrofes.'
    },
    tipo_sangre: { required: 'Elegí tu tipo de sangre.' },
    color_ojos: { required: 'Elegí el color de tus ojos.' },
    dias_vacaciones: {
      required: 'Ingresá la cantidad de días.',
      min: 'No puede ser un número negativo.',
      max: 'No puede superar los 365 días.',
      pattern: 'Ingresá un número entero, sin decimales.'
    }
  };

  dia = signal('');
  mes = signal<number | null>(null);
  anio = signal('');
  errorFecha = signal<string | null>(null);
  intentoEnvio = signal(false);
  enviando = signal(false);
  mostrarPassword = signal(false);
  errorServidor = signal<string | null>(null);

  registroForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(REGEX_EMAIL)]],
    password: ['', [Validators.required, passwordFuerte]],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.pattern(REGEX_NOMBRE)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.pattern(REGEX_NOMBRE)]],
    fecha_nacimiento: ['', Validators.required],
    tipo_sangre: ['', Validators.required],
    color_ojos: ['', Validators.required],
    dias_vacaciones: [0, [Validators.required, Validators.min(0), Validators.max(365), Validators.pattern(/^\d+$/)]]
  });

  error(campo: Campo): string | null {
    const control = this.registroForm.controls[campo];
    if (control.valid) return null;
    if (!(control.touched || control.dirty || this.intentoEnvio())) return null;

    const clave = Object.keys(control.errors ?? {})[0];
    return this.MENSAJES[campo][clave] ?? 'Revisá este campo.';
  }

  mensajeFecha(): string | null {
    if (this.errorFecha()) return this.errorFecha();
    const incompleta = !this.registroForm.controls.fecha_nacimiento.value;
    return this.intentoEnvio() && incompleta ? 'Completá día, mes y año.' : null;
  }

  requisitosPassword() {
    const valor = String(this.registroForm.controls.password.value ?? '');
    return REQUISITOS_PASSWORD.map(r => ({ texto: r.texto, cumple: r.cumple(valor) }));
  }

  actualizarDia(evento: Event) {
    this.dia.set(this.soloDigitos(evento, 2));
    this.sincronizarFecha();
  }

  actualizarAnio(evento: Event) {
    this.anio.set(this.soloDigitos(evento, 4));
    this.sincronizarFecha();
  }

  elegirMes(numero: number) {
    this.mes.set(numero);
    this.sincronizarFecha();
  }

  elegir(campo: 'tipo_sangre' | 'color_ojos' | 'dias_vacaciones', valor: string | number) {
    this.registroForm.get(campo)?.setValue(valor);
  }

  async registrar() {
    this.intentoEnvio.set(true);
    this.registroForm.markAllAsTouched();

    if (this.registroForm.invalid || this.errorFecha()) {
      this.irAlPrimerError();
      return;
    }

    if (this.enviando()) return;

    this.enviando.set(true);
    this.errorServidor.set(null);

    try {
      const valores = this.registroForm.getRawValue();
      const nuevoUsuario = {
        ...valores,
        email: valores.email.trim().toLowerCase(),
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim()
      } as IAuthData;

      await this.authService.registrar(nuevoUsuario);

      alert('Registro exitoso! Ya puedes iniciar sesion.');
      this.reiniciar();
    } catch (error: any) {
      console.error('Error en el registro', error);
      this.errorServidor.set(this.traducirError(error));
      this.irAlPrimerError();
    } finally {
      this.enviando.set(false);
    }
  }

  private reiniciar() {
    this.registroForm.reset({ dias_vacaciones: 0 });
    this.dia.set('');
    this.mes.set(null);
    this.anio.set('');
    this.errorFecha.set(null);
    this.intentoEnvio.set(false);
  }

  private traducirError(error: any): string {
    const mensaje = String(error?.message ?? '').toLowerCase();

    if (mensaje.includes('email_existente') || mensaje.includes('already registered')) {
      return 'Ya existe una cuenta con ese email. Probá iniciar sesión.';
    }
    if (mensaje.includes('password')) {
      return 'La contraseña no fue aceptada. Probá con una más segura.';
    }
    if (error?.status === 429 || mensaje.includes('rate limit')) {
      return 'Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.';
    }
    if (mensaje.includes('failed to fetch') || mensaje.includes('network')) {
      return 'No hay conexión con el servidor. Revisá tu internet.';
    }
    return 'No se pudo crear la cuenta. Intentá de nuevo en unos minutos.';
  }

  private irAlPrimerError() {
    setTimeout(() => {
      this.host.nativeElement
        .querySelector('.banner-error, .mensaje-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private soloDigitos(evento: Event, maximo: number): string {
    const campo = evento.target as HTMLInputElement;
    const limpio = campo.value.replace(/\D/g, '').slice(0, maximo);
    campo.value = limpio;
    return limpio;
  }

  private sincronizarFecha() {
    const control = this.registroForm.controls.fecha_nacimiento;
    const diaTexto = this.dia();
    const dia = Number(diaTexto);
    const mes = this.mes();
    const anioTexto = this.anio();

    control.setValue('');
    this.errorFecha.set(null);

    if (diaTexto && (dia < 1 || dia > 31)) {
      this.errorFecha.set('El día tiene que estar entre 1 y 31.');
      return;
    }

    if (!dia || !mes || anioTexto.length !== 4) return;

    const anio = Number(anioTexto);

    if (anio < 1900) {
      this.errorFecha.set('El año tiene que ser 1900 o posterior.');
      return;
    }

    const fecha = new Date(anio, mes - 1, dia);
    const existe = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

    if (!existe) {
      this.errorFecha.set('Esa fecha no existe. Revisá el día y el mes.');
      return;
    }

    if (fecha > new Date()) {
      this.errorFecha.set('La fecha de nacimiento no puede ser futura.');
      return;
    }

    control.setValue(`${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
  }
}