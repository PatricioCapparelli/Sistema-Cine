import { Component, inject, OnInit, signal } from '@angular/core'; // Importar signal
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CineService } from '../../core/services/cine.service';
import { IPelicula } from '../../core/interfaces/Pelicula';
import { Pelicula } from '../../componentes/pelicula/pelicula'; // Ajustá la ruta si hace falta

@Component({
    selector: 'app-abm-peliculas',
    standalone: true,
    imports: [ReactiveFormsModule, Pelicula],
    templateUrl: './abm-peliculas.html',
    styleUrl: './abm-peliculas.css'
})
export class AbmPeliculasComponent implements OnInit {
    private fb = inject(FormBuilder);
    private cineService = inject(CineService);
    listaPeliculas = signal<IPelicula[]>([]);

    peliculaForm = this.fb.group({
        nombre: ['', Validators.required],
        sinopsis: ['', Validators.required],
        imagen_url: ['', Validators.required],
        duracion_minutos: [0, [Validators.required, Validators.min(1)]]
    });

    ngOnInit() {
        this.cargarPeliculas();
    }

    async cargarPeliculas() {
        try {
            const pelis = await this.cineService.obtenerPeliculas();
            this.listaPeliculas.set(pelis || []); 
        } catch (error) {
            console.error('Error al cargar la lista', error);
        }
    }

    async guardarPelicula() {
        if (this.peliculaForm.valid) {
            try {
                const nuevaPelicula = this.peliculaForm.value as IPelicula;
                await this.cineService.crearPelicula(nuevaPelicula);

                alert('Pelicula guardada con exito');
                this.peliculaForm.reset();

                this.cargarPeliculas();
            } catch (error) {
                console.error('Error al guardar', error);
            }
        }
    }

    async eliminarPeliculaDeBD(id: number | undefined) {
        if (!id) return;
        
        const confirmacion = confirm('Estas seguro de que queres borrar esta pelicula?');
        if (!confirmacion) return;

        try {
            await this.cineService.eliminarPelicula(id);
            this.cargarPeliculas();
        } catch (error) {
            console.error('Error al borrar', error);
        }
    }
}