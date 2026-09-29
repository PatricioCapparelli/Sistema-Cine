import { Service, inject, signal } from '@angular/core';
import { PromocionesService } from './promociones.service';
import { Supabase } from './supabase.service';
@Service()
export class SesionCompraService {

    constructor() {
        const usuarioGuardado = localStorage.getItem('usuarioCine');
        if (usuarioGuardado) {
            const usuario = JSON.parse(usuarioGuardado);
            this.esAnonimo.set(false);
            this.emailComprador.set(usuario.email);
            this.datosUsuario.set(usuario);
            this.evaluarDescuentos(usuario);
        }
    }

    private promocionesService = inject(PromocionesService);
    private supabaseS = inject(Supabase);
    private s = this.supabaseS.Supabase;

    esAnonimo = signal<boolean>(false);
    emailComprador = signal<string>('');
    datosUsuario = signal<any>(null);

    precioBaseEntrada = 5000;
    descuentoAplicado = signal<number>(0);

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