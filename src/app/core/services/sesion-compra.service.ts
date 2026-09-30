import { Service, inject, signal, effect } from '@angular/core';
import { PromocionesService } from './promociones.service';
import { Supabase } from './supabase.service';
import { Auth } from '../../core/services/auth.service'; // Ajustá la ruta según tu estructura

@Service()
export class SesionCompraService {
    private promocionesService = inject(PromocionesService);
    private supabaseS = inject(Supabase);
    private authS = inject(Auth);
    private s = this.supabaseS.Supabase;

    esAnonimo = signal<boolean>(false);
    emailComprador = signal<string>('');
    datosUsuario = signal<any>(null);

    precioBaseEntrada = 5000;
    descuentoAplicado = signal<number>(0);

    constructor() {
        // El effect se ejecuta automáticamente cuando las señales de Auth cambian
        effect(() => {
            const perfil = this.authS.perfilActual();
            const usuarioAuth = this.authS.usuarioActual();

            if (perfil && usuarioAuth) {
                // Combinamos el perfil con el email de auth porque evaluarDescuentos y la vista lo requieren
                const usuarioCompleto = { ...perfil, email: usuarioAuth.email };
                this.iniciarComoRegistrado(usuarioCompleto);
            } else if (!this.esAnonimo()) {
                // Limpieza en caso de cierre de sesión
                this.datosUsuario.set(null);
                this.emailComprador.set('');
                this.descuentoAplicado.set(0);
            }
        }, { allowSignalWrites: true }); 

    }

    iniciarComoAnonimo(email: string) {
        this.esAnonimo.set(true);
        this.emailComprador.set(email);
        this.datosUsuario.set(null);
        this.descuentoAplicado.set(0);
        localStorage.removeItem('usuarioCine');
    }

    iniciarComoRegistrado(usuario: any) {
        this.esAnonimo.set(false);
        this.emailComprador.set(usuario.email);
        this.datosUsuario.set(usuario);
        this.evaluarDescuentos(usuario);
        localStorage.setItem('usuarioCine', JSON.stringify(usuario)); 
    }

    private async evaluarDescuentos(usuario: any) {
        let mejorDescuento = 0;

        try {
            const promociones = await this.promocionesService.obtenerPromocionesActivas();

            const promoBienvenida = promociones.find((p: any) => p.codigo_interno.toUpperCase() === 'PRIMERA_COMPRA');
            const promoMayores = promociones.find((p: any) => p.codigo_interno.toUpperCase() === 'MAYOR_50');

            if (usuario.uso_cupon === false && promoBienvenida) {
                mejorDescuento = promoBienvenida.porcentaje_descuento;
            }

            if (usuario.fecha_nacimiento && promoMayores) {
                const edad = this.calcularEdad(usuario.fecha_nacimiento);
                if (edad >= 50 && promoMayores.porcentaje_descuento > mejorDescuento) {
                    mejorDescuento = promoMayores.porcentaje_descuento;
                }
            }
            this.descuentoAplicado.set(mejorDescuento);

        } catch (error) {
            console.error('Error al cargar las promociones:', error);
            this.descuentoAplicado.set(0);
        }
    }

    private calcularEdad(fechaNacimiento: string): number {
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    }

    async marcarCuponUsado(usuarioId: string) {
        const { error } = await this.s
            .from('Usuarios')
            .update({ uso_cupon: true })
            .eq('id', usuarioId);
        if (error) throw new Error('Error al actualizar el cupón del usuario');

    }
}