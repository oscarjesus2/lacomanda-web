import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { PedidoCab } from '../models/pedido.models';
import { PedidoDelete } from '../models/pedido.delete.models';
import { ResponseService } from '../models/response.services';
import { Venta } from '../models/venta.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from '../interfaces/pedidomesaDTO.interface';

@Injectable({
    providedIn: 'root'
})
export class PedidoService {

    
    private basePath = environment.apiUrl + '/pedido';
    private basePathDeletePedido = environment.apiUrl +  '/pedido/pedidodet';
    private basePathConsultarMesa = environment.apiUrl +  '/venta/ConsultarMesa';
 
    constructor(private http: HttpClient) { }

    ImprimirPedido(pedido: PedidoCab): Observable<any[]> {
        return this.http.post<any[]>(this.basePath + '/grabarpedido', pedido);
    }

    totalapagar_x_detallepedido(idPedidoCobrar: number, nroCuentaCobrar: number): Observable<any[]> {
        return this.http.get<any[]>(this.basePath + '/totalapagar_x_detallepedido/' +  idPedidoCobrar + '/' + nroCuentaCobrar);
    }

    findPedidoMesaByIdMesa(idMesa: string): Observable<ApiResponse<PedidoMesaDTO[]>> {
        return this.http.get<ApiResponse<PedidoMesaDTO[]>>(this.basePath + '/listarpedido_x_mesa/' + idMesa);
    }
    
    findMesaById(idMesa: string): Observable<any[]> {
        return this.http.get<any[]>(this.basePathConsultarMesa + idMesa);
    }
    
    registerPedido(pedido: PedidoCab): Observable<any[]> {
        return this.http.post<any[]>(this.basePath + '/grabarpedido', pedido);
    }

    deletePedido(pedido: PedidoDelete): Observable<ResponseService> {
        return this.http.post<ResponseService>(this.basePathDeletePedido, pedido);
    }
}