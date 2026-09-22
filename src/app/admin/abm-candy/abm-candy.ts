import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService } from '../../core/services/candy.service';
import { LoadingService } from '../../core/services/loading.service';
import { IProductoCandy, ICategoriaCandy } from '../../core/interfaces/Candy';

@Component({
    selector: 'app-abm-candy',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './abm-candy.html',
    styleUrl: './abm-candy.css'
})
export class AbmCandyComponent implements OnInit {
    private fb = inject(FormBuilder);
    private candyService = inject(CandyService);
    private loadingService = inject(LoadingService); 

    listaProductos = signal<IProductoCandy[]>([]);
    listaCategorias = signal<ICategoriaCandy[]>([]);

    candyForm = this.fb.group({
        nombre: ['', Validators.required],
        descripcion: ['', Validators.required],
        precio: [0, [Validators.required, Validators.min(1)]],
        stock: [0, [Validators.required, Validators.min(0)]],
        imagen_url: ['', Validators.required],
        id_categoria: [0, [Validators.required, Validators.min(1)]] 
    });

    ngOnInit() {
        this.cargarDatosGenerales();
        console.log(this.listaCategorias);
    }

    async cargarDatosGenerales() {
        this.loadingService.mostrar();
        try {
            // Promise.all permite traer categorias y productos al mismo tiempo
            const [categorias, productos] = await Promise.all([
                this.candyService.obtenerCategorias(),
                this.candyService.obtenerProductos()
            ]);
            
            this.listaCategorias.set(categorias);
            this.listaProductos.set(productos);
        } catch (error) {
            console.error('Error al cargar datos del Candy Bar', error);
        } finally {
            this.loadingService.ocultar();
        }
    }

    async guardarProducto() {
        if (this.candyForm.invalid) {
            alert('Por favor, completa todos los campos correctamente.');
            return;
        }

        this.loadingService.mostrar();
        try {
            const nuevoProducto = {
                ...this.candyForm.value,
                id_categoria: Number(this.candyForm.value.id_categoria)
            } as IProductoCandy;

            await this.candyService.crearProducto(nuevoProducto);
            
            alert('Producto de Candy Bar agregado con exito');
            this.candyForm.reset({ precio: 0, stock: 0, id_categoria: 0 });
            
            await this.cargarDatosGenerales();
        } catch (error) {
            console.error('Error al guardar el producto', error);
            alert('Hubo un error al guardar el producto.');
        } finally {
            this.loadingService.ocultar();
        }
    }

    async eliminarProductoDeBD(id: number | undefined) {
        if (!id) return;
        
        const confirmacion = confirm('¿Estas seguro de que queres borrar este producto?');
        if (!confirmacion) return;

        this.loadingService.mostrar();
        try {
            await this.candyService.eliminarProducto(id);
            await this.cargarDatosGenerales();
        } catch (error) {
            console.error('Error al borrar el producto', error);
        } finally {
            this.loadingService.ocultar();
        }
    }
}