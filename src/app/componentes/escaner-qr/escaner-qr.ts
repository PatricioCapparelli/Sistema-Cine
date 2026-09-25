import { Component, inject, ChangeDetectorRef } from '@angular/core'; 
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
  private cdr = inject(ChangeDetectorRef); 
  
  mensajeResultado = '';
  claseResultado = '';
  candyResultados: any[] = [];
  escaneando = true;

  async procesarQR(resultadoString: string) {
    if (!resultadoString) return; 

    this.escaneando = false; 
    this.mensajeResultado = 'Validando ticket...';
    this.claseResultado = 'info';
    this.candyResultados = [];
    
    this.cdr.detectChanges(); 

    try {
      const resultado = await this.funcionesService.validarTicketEscaneado(resultadoString);
      
      this.mensajeResultado = `${resultado.mensaje} - (${resultado.pelicula})`; 
      this.candyResultados = resultado.candy;
      this.claseResultado = 'exito';

      this.cdr.detectChanges(); 

    } catch (error: any) {
      this.mensajeResultado = error.message;
      this.claseResultado = 'error';
      
      this.cdr.detectChanges(); 
      
    } finally {
      setTimeout(() => {
        this.mensajeResultado = '';
        this.candyResultados = [];
        this.escaneando = true;
        
        this.cdr.detectChanges(); 
      }, 4000);
    }
  }

  silenciarRuido() {
  }
}