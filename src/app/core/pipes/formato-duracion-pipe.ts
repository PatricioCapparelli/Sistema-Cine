import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatoDuracion', 
  standalone: true
})
export class FormatoDuracionPipe implements PipeTransform {
  
  transform(minutos: number | undefined | null): string {
    if (!minutos || minutos <= 0) {
      return '0 min';
    }

    if (minutos < 60) {
      return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    if (minutosRestantes === 0) {
      return `${horas} hr`;
    }

    return `${horas} h ${minutosRestantes} min`;
  }
}