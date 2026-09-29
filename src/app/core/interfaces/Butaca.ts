export interface Butaca {
    id: string;
    fila: string;
    numero: number;
    estado: 'libre' | 'seleccionada' | 'ocupada';
    tipo?: 'normal' | 'accesible';
}
