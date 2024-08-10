import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Product } from '../models/product.models';
import { PedidoDet } from '../models/pedidodet.models';
import { ProductSave } from '../models/product.save.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    private basePath = environment.apiUrl + '/producto';

    constructor(private http: HttpClient) { }

    getProductosParaVenta(idCompu: number): Observable<Product[]> {
        return this.http.get<Product[]>(this.basePath + '/ListarProductosParaVenta/' + idCompu);
    }
    getAllProducts(): Observable<Product[]> {
        return this.http.get<Product[]>(this.basePath+ '/listar');
    }

    // getListaProductosPedidoDet(): Observable<PedidoDet[]> {
    //     return this.http.get<PedidoDet[]>(this.basePath);
    // }
    
    guardarProducto(producto: ProductSave): Observable<any> {
        return this.http.post<any>(this.basePath, producto);
    }

}