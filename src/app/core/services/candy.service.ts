import { Supabase } from './supabase.service';
import { ICategoriaCandy, IProductoCandy } from '../interfaces/Candy';
import { inject, Service } from '@angular/core';

@Service()
export class CandyService {
    private supabase = inject(Supabase);
    private s = this.supabase.Supabase;

    async registrarVentaCandy(itemsCandy: any[]) {

    const { error } = await this.s.from('Venta_Candy').insert(itemsCandy);
    
    if (error) {
        console.error('Error insertando Candy en Supabase:', error);
        throw error;
    }
}
    async obtenerCategorias(): Promise<ICategoriaCandy[]> {
        const { data, error } = await this.s.from('Categorias_Candy').select('*');
        if (error) throw error;
        return data || [];
    }

    async obtenerProductos(): Promise<IProductoCandy[]> {
        const { data, error } = await this.s
            .from('Productos_Candy')
            .select('*, Categorias_Candy(nombre)');
        if (error) throw error;
        return data || [];
    }

    async crearProducto(producto: IProductoCandy): Promise<void> {
        const { error } = await this.s.from('Productos_Candy').insert(producto);
        if (error) throw error;
    }

    async eliminarProducto(id: number): Promise<void> {
        const { error } = await this.s.from('Productos_Candy').delete().eq('id', id);
        if (error) throw error;
    }
}