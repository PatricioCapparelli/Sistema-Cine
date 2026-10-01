export interface IProxima {
    id: number;
    nombre: string;
    imagen_url: string | null;
    genero: string | null;
    fecha_estreno: string;
    preventa_activa: boolean;
    precio_preventa: number | null;
    dias_preventa: number;
}

export interface IAviso {
    pelicula_id: number;
    nombre: string;
}

export interface IPeliculaVista {
    funcion_id: number;
    pelicula_id: number;
    nombre: string;
    imagen_url: string | null;
    fecha_funcion: string;
    entradas: number;
    calificacion: number | null;
}
