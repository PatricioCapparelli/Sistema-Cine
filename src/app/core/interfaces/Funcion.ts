export interface IFuncion {
    id?: number;
    created_at?: string;
    pelicula_id: number;
    sala_id: number;
    fecha_hora_inicio: string; 
    formato_visual: string;
    formato_audio: string;
}