export interface IPelicula {
    id?: number;
    created_at?: string;
    nombre: string;
    sinopsis: string;
    imagen_url: string;
    duracion_minutos: number;
    genero: string;
    edad_minima: number;
    fecha_estreno?: string | null;
    preventa_activa?: boolean;
    precio_preventa?: number | null;
    dias_preventa?: number;
}