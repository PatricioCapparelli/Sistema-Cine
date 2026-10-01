import { DatosEstreno, EstadoVenta } from "../../interfaces/DatosEstreno";

const aFecha = (fecha: Date) => fecha.toLocaleDateString('en-CA');

export function inicioPreventa(pelicula: DatosEstreno): string | null {
  if (!pelicula.fecha_estreno || !pelicula.preventa_activa) return null;
  const inicio = new Date(`${pelicula.fecha_estreno}T12:00:00`);
  inicio.setDate(inicio.getDate() - (pelicula.dias_preventa ?? 7));
  return aFecha(inicio);
}

export function estadoVenta(pelicula: DatosEstreno, hoy: string = aFecha(new Date())): EstadoVenta {
  if (!pelicula.fecha_estreno || hoy >= pelicula.fecha_estreno) return 'en_venta';
  const inicio = inicioPreventa(pelicula);
  return inicio && hoy >= inicio ? 'preventa' : 'proximamente';
}

export function precioEntrada(pelicula: DatosEstreno, precioBase: number, hoy?: string): number {
  return estadoVenta(pelicula, hoy) === 'preventa' && pelicula.precio_preventa
    ? pelicula.precio_preventa
    : precioBase;
}