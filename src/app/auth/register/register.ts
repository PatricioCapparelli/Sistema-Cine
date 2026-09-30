import { Component, inject, signal } from '@angular/core';
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

  readonly MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  readonly TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly COLORES_OJOS = ['Marrón', 'Azul', 'Verde', 'Miel/Avellana', 'Gris', 'Negro', 'Otro'];
  readonly DIAS_VACACIONES = [0, 7, 14, 21, 28];

  dia = signal('');
  mes = signal<number | null>(null);
  anio = signal('');
  fechaInvalida = signal(false);

  registroForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6),
      Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    fecha_nacimiento: ['', Validators.required],
    tipo_sangre: ['', Validators.required],
    color_ojos: ['', Validators.required],
    dias_vacaciones: [0, [Validators.required, Validators.min(0)]]
  });

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
    if (this.registroForm.invalid) return;

    try {
      const nuevoUsuario = this.registroForm.value as IAuthData;
      await this.authService.registrar(nuevoUsuario);

      alert('Registro exitoso! Ya puedes iniciar sesion.');
      this.registroForm.reset({ dias_vacaciones: 0 });
      this.dia.set('');
      this.mes.set(null);
      this.anio.set('');
      this.fechaInvalida.set(false);
    } catch (error) {
      console.error('Error en el registro', error);
      alert('Error al registrar el usuario.');
    }
  }

  private soloDigitos(evento: Event, maximo: number): string {
    const campo = evento.target as HTMLInputElement;
    const limpio = campo.value.replace(/\D/g, '').slice(0, maximo);
    campo.value = limpio;
    return limpio;
  }

  private sincronizarFecha() {
    const control = this.registroForm.controls.fecha_nacimiento;
    const dia = Number(this.dia());
    const mes = this.mes();
    const anioTexto = this.anio();

    if (!dia || !mes || anioTexto.length !== 4) {
      control.setValue('');
      this.fechaInvalida.set(false);
      return;
    }

    const anio = Number(anioTexto);
    const fecha = new Date(anio, mes - 1, dia);
    const valida =
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia &&
      anio >= 1900 &&
      fecha <= new Date();

    this.fechaInvalida.set(!valida);
    control.setValue(valida ? `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : '');
  }
}