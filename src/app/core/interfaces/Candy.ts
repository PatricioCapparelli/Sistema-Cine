export interface ICategoriaCandy {
    id?: number;
    nombre: string;
}

export interface IProductoCandy {
    id?: number;
    id_categoria: number;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen_url: string;
    stock: number;
    Categorias_Candy?: ICategoriaCandy; 
}