export interface IRecompensa {
    id: number;
    nombre: string;
    tipo: 'entrada' | 'candy';
    costo_puntos: number;
    activa: boolean;
}

export interface ICanje {
    id: number;
    nombre_recompensa: string;
    puntos_gastados: number;
    codigo: string;
    estado: string;
    created_at: string;
}
