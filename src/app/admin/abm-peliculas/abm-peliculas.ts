import { Component, inject, OnInit } from '@angular/core'; // Agregamos OnInit
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CineService } from '../../core/services/cine.service';
import { IPelicula } from '../../core/interfaces/Pelicula';

@Component({
    selector: 'app-abm-peliculas',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './abm-peliculas.html',
    styleUrl: './abm-peliculas.css'
})
export class AbmPeliculasComponent implements OnInit {
    private fb = inject(FormBuilder);
    private cineService = inject(CineService);

    listaPeliculas: IPelicula[] = [];

    peliculaForm = this.fb.group({
        nombre: ['', Validators.required],
        sinopsis: ['', Validators.required],
        imagen_url: ['', Validators.required],
        duracion_min: [0, [Validators.required, Validators.min(1)]]
    });

    ngOnInit() {
        this.cargarPeliculas();
    }

    async cargarPeliculas() {
        try {
            this.listaPeliculas = await this.cineService.obtenerPeliculas();
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

    async borrarPelicula(id: number | undefined) {
        if (!id) return;

        try {
            await this.cineService.eliminarPelicula(id);
            this.cargarPeliculas();
        } catch (error) {
            console.error('Error al borrar', error);
        }

    }
}