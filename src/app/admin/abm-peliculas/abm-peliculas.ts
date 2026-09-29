import { Component, inject, OnInit, signal } from '@angular/core'; 
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { PeliculasService } from '../../core/services/peliculas.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { IPelicula } from '../../core/interfaces/Pelicula';
import { Tmdb } from '../../core/interfaces/Tmdb';
import { Pelicula } from '../../componentes/pelicula/pelicula'; 
import { SlicePipe } from '@angular/common';

@Component({
    selector: 'app-abm-peliculas',
    standalone: true,
    imports: [ReactiveFormsModule, FormsModule, Pelicula, SlicePipe], 
    templateUrl: './abm-peliculas.html',
    styleUrl: './abm-peliculas.css'
})
export class AbmPeliculasComponent implements OnInit {
    private fb = inject(FormBuilder);
    private peliculasService = inject(PeliculasService);
    private tmdbService = inject(TmdbService); 

    listaPeliculas = signal<IPelicula[]>([]);
    terminoBusqueda = signal<string>('');
    resultadosTmdb = signal<Tmdb[]>([]);

    peliculaForm = this.fb.group({
        nombre: ['', Validators.required],
        sinopsis: ['', Validators.required],
        imagen_url: ['', Validators.required],
        duracion_minutos: [0, [Validators.required, Validators.min(1)]],
        genero: ['', Validators.required],
        edad_minima: [0, [Validators.required, Validators.min(0)]]
    });

    ngOnInit() {
        this.cargarPeliculas();
    }

    buscarEnTmdb() {
        const termino = this.terminoBusqueda().trim();
        if (!termino) return;
        
        this.tmdbService.buscar(termino).subscribe({
            next: (resultados) => this.resultadosTmdb.set(resultados),
            error: (err) => console.error('Error buscando en TMDB', err)
        });
    }

    seleccionarPelicula(idTmdb: number) {
        this.tmdbService.detalle(idTmdb).subscribe({
            next: (peliCompletada) => {
                this.peliculaForm.patchValue({
                    nombre: peliCompletada.nombre,
                    sinopsis: peliCompletada.sinopsis,
                    imagen_url: peliCompletada.imagen_url,
                    duracion_minutos: peliCompletada.duracion_minutos,
                    genero: peliCompletada.genero
                });
                
                this.resultadosTmdb.set([]);
                this.terminoBusqueda.set('');
            },
            error: (err) => console.error('Error trayendo detalles', err)
        });
    }

    async cargarPeliculas() {
        try {
            const pelis = await this.peliculasService.obtenerPeliculas();
            this.listaPeliculas.set(pelis || []); 
        } catch (error) {
            console.error('Error al cargar la lista', error);
        }
    }

    async guardarPelicula() {
        if (this.peliculaForm.valid) {
            try {
                const nuevaPelicula = this.peliculaForm.value as IPelicula;
                await this.peliculasService.crearPelicula(nuevaPelicula);

                alert('Pelicula guardada con exito');
                this.peliculaForm.reset({ duracion_minutos: 0, edad_minima: 0 });

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
            await this.peliculasService.eliminarPelicula(id);
            this.cargarPeliculas();
        } catch (error) {
            console.error('Error al borrar', error);
        }
    }
}