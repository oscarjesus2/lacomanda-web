import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Producto } from '../models/product.models';
import { PedidoDet } from '../models/pedidodet.models';
import { ProductSave } from '../models/product.save.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class ProductoService {

    private basePath = environment.apiUrl + '/producto';

    constructor(private http: HttpClient) { }

    getProductosParaVenta(ip: string): Observable<Producto[]> {
        return this.http.get<Producto[]>(this.basePath + '/ListarProductosParaVenta/' + ip);
    }

    getAllProductosTablero(): Observable<ApiResponse<Producto[]>> {
        return this.http.get<ApiResponse<Producto[]>>(this.basePath+ '/tablero');
    }
    
    guardarProducto(producto: ProductSave): Observable<any> {
        return this.http.post<any>(this.basePath, producto);
    }

    getAllProductos(): Observable<ApiResponse<Producto[]>> {
        return this.http.get<ApiResponse<Producto[]>>(`${this.basePath}`);
    }
    
    obtener(id: number): Observable<ApiResponse<Producto>> {
        return this.http.get<ApiResponse<Producto>>(`${this.basePath}/${id}`);
    }
    crear(p: Producto): Observable<ApiResponse<Producto>> {
        return this.http.post<ApiResponse<Producto>>(this.basePath, p);
    }
    actualizar(p: Producto): Observable<ApiResponse<Producto>> {
        return this.http.put<ApiResponse<Producto>>(`${this.basePath}/${p.IdProducto}`, p);
    }
    eliminar(id: number): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
    }

}