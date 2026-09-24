import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { FuncionesService } from '../../core/services/funciones.service'; 

@Component({
  selector: 'app-escaner-qr',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  templateUrl: './escaner-qr.html',
  styleUrl: './escaner-qr.css'
})
export class EscanerQrComponent {
  private funcionesService = inject(FuncionesService);
  
  mensajeResultado = '';
  claseResultado = '';
  candyResultados: any[] = [];
  escaneando = true; 

  async procesarQR(resultadoString: string) {
    if (!this.escaneando) return; 
    
    this.escaneando = false; 
    this.mensajeResultado = 'Validando ticket...';
    this.claseResultado = 'info';

    try {
      const resultado = await this.funcionesService.validarTicketEscaneado(resultadoString);
      this.mensajeResultado = resultado.mensaje;
      this.candyResultados = resultado.candy;
      this.claseResultado = 'exito';
    } catch (error: any) {
      this.mensajeResultado = error.message;
      this.claseResultado = 'error';
    }

    setTimeout(() => {
      this.mensajeResultado = '';
      this.candyResultados = [];
      this.escaneando = true;
    }, 4000);
  }
}