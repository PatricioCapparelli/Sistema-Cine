export type EstadoVenta = 'en_venta' | 'preventa' | 'proximamente';

export interface DatosEstreno {
  fecha_estreno?: string | null;
  preventa_activa?: boolean | null;
  precio_preventa?: number | null;
  dias_preventa?: number | null;
}