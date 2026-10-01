export interface ICombo {
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
    imagen_url: string | null;
    activo: boolean;
    destacado: boolean;
}

export type ComboNuevo = Pick<ICombo, 'nombre' | 'descripcion' | 'precio' | 'imagen_url'>;