import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tmdb } from '../interfaces/Tmdb';
import { IPelicula } from '../interfaces/Pelicula';

@Service()
export class TmdbService {
    private http = inject(HttpClient);
    private readonly base = 'https://api.themoviedb.org/3';
    private readonly img = 'https://image.tmdb.org/t/p/w500';
    private readonly headers = { Authorization: `Bearer ${environment.tmdbToken}` };

    buscar(titulo: string) {
        return this.http
            .get<{ results: Tmdb[] }>(`${this.base}/search/movie`, {
                headers: this.headers,
                params: { query: titulo, language: 'es-AR', include_adult: 'false' }
            })
            .pipe(map(r => r.results.slice(0, 8)));
    }

    detalle(id: number) {
        return this.http
            .get<any>(`${this.base}/movie/${id}`, {
                headers: this.headers,
                params: { language: 'es-AR' }
            })
            .pipe(
                switchMap(d =>
                    d.overview
                        ? of(d) // deja pasar los datos de la sinopsis
                        : this.http 
                            .get<any>(`${this.base}/movie/${id}`, {
                                headers: this.headers,
                                params: { language: 'en-US' }
                            })
                            .pipe(map(item => ({ ...d, overview: item.overview }))) // sinopsis en ingles + datos
                ),
                map(
                    d =>
                        ({
                            nombre: d.title,
                            sinopsis: d.overview || 'Sin sinopsis disponible.',
                            imagen_url: d.poster_path ? `${this.img}${d.poster_path}` : '',
                            duracion_minutos: d.runtime ?? 0,
                            genero: d.genres && d.genres.length > 0
                                ? d.genres.map((g: any) => g.name).join(', ')
                                : 'Sin genero'
                        }) as IPelicula
                )
            );
    }
}