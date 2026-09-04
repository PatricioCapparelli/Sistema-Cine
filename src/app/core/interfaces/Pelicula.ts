export interface IPelicula {
    id?: number; 
    created_at?: string; 
    nombre: string;
    sinopsis: string;
    imagen_url: string;
    duracion_min: number;
}