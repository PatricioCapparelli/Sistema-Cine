export interface Venta {
    id?: string;
    created_at?: string;
    usuario_id: string | null;
    funcion_id: string | number;
    email_comprador: string;
    monto_total: number;
    butaca_id: string;
}