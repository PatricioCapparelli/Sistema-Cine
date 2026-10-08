import { Service } from '@angular/core';
import Swal from 'sweetalert2';

@Service()
export class AlertaService {
    exito(mensaje: string, titulo = '¡Listo!') {
        return Swal.fire({ icon: 'success', title: titulo, text: mensaje });
    }

    error(mensaje: string, titulo = 'Error') {
        return Swal.fire({ icon: 'error', title: titulo, text: mensaje });
    }

    aviso(mensaje: string, titulo = 'Atención') {
        return Swal.fire({ icon: 'warning', title: titulo, text: mensaje });
    }

    async confirmar(mensaje: string, titulo = '¿Estás seguro?'): Promise<boolean> {
        const r = await Swal.fire({
            icon: 'question',
            title: titulo,
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: 'Sí',
            cancelButtonText: 'Cancelar',
        });
        return r.isConfirmed;
    }
}