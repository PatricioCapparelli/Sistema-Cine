import { Component, inject, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { FuncionesService } from '../../core/services/funciones.service'; 
import { Supabase } from '../../core/services/supabase.service';

@Component({
  selector: 'app-escaner-qr',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  templateUrl: './escaner-qr.html',
  styleUrl: './escaner-qr.css'
})
export class EscanerQrComponent {
  private funcionesService = inject(FuncionesService);
  private supabaseS = inject(Supabase);
  private cdr = inject(ChangeDetectorRef); 
  
  modoEscaneo: 'ticket' | 'canje' = 'ticket'; 

  mensajeResultado = '';
  claseResultado = '';
  candyResultados: any[] = [];
  recompensaCanje = ''; 
  escaneando = true;

  async procesarQR(resultadoString: string) {
    if (!resultadoString) return; 

    this.escaneando = false; 
    this.mensajeResultado = 'Validando código...';
    this.claseResultado = 'info';
    this.candyResultados = [];
    this.recompensaCanje = '';
    
    this.cdr.detectChanges(); 

    try {
      if (this.modoEscaneo === 'ticket') {
        const resultado = await this.funcionesService.validarTicketEscaneado(resultadoString);
        this.mensajeResultado = `${resultado.mensaje} - (${resultado.pelicula})`; 
        this.candyResultados = resultado.candy;
        this.claseResultado = 'exito';

      } else {
        // NUEVA LÓGICA DE CANJE DE PUNTOS (ATÓMICA DIRECTA)
        const { data, error } = await this.supabaseS.Supabase
            .from('Canjes')
            .update({ estado: 'usado' })
            .eq('codigo', resultadoString)
            .eq('estado', 'pendiente') // Actúa como candado de seguridad
            .select()
            .maybeSingle();

        if (error) throw new Error('Error al conectar con el servidor.');
        
        if (!data) {
            // Si no devuelve nada, o no existe o ya estaba marcado como 'usado'
            throw new Error('El código no existe o ya fue utilizado.');
        }

        this.mensajeResultado = 'Canje validado correctamente.';
        this.recompensaCanje = data.nombre_recompensa;
        this.claseResultado = 'exito';
      }

    } catch (error: any) {
      this.mensajeResultado = error.message;
      this.claseResultado = 'error';
    } finally {
      this.cdr.detectChanges(); 
      setTimeout(() => {
        this.mensajeResultado = '';
        this.candyResultados = [];
        this.recompensaCanje = '';
        this.escaneando = true;
        this.cdr.detectChanges(); 
      }, 4000);
    }
  }

  silenciarRuido() {
  }
}