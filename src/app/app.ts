import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './componentes/navbar/navbar';
import { LoadingService } from './core/services/loading.service';
import { BarraPwa } from './componentes/barra-pwa/barra-pwa';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, BarraPwa],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public LoadingService = inject(LoadingService);
}
