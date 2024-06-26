import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { PedidoCab } from '../models/pedido.models';
import { PedidoDelete } from '../models/pedido.delete.models';
import { ResponseService } from '../models/response.services';
import { Venta } from '../models/venta.models';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PedidoService {

    private basePathRegisterPedido = environment.apiUrl + '/pedidos/grabarpedido';
    private basePathDeletePedido = environment.apiUrl +  '/pedidos/pedidodet';
    private basePathGragaDocumentoVenta = environment.apiUrl +  '/ventas/grabardocumentoventa';
    private basePathConsultarMesa = environment.apiUrl +  '/ventas/ConsultarMesa';
    constructor(private http: HttpClient) { }

    ImprimirPedido(pedido: PedidoCab): Observable<any[]> {
        return this.http.post<any[]>(this.basePathRegisterPedido, pedido);
    }

    findMesaById(idMesa: string): Observable<any[]> {
        return this.http.get<any[]>(this.basePathConsultarMesa + idMesa);
    }
    
    registerPedido(pedido: PedidoCab): Observable<any[]> {
        return this.http.post<any[]>(this.basePathRegisterPedido, pedido);
    }

    deletePedido(pedido: PedidoDelete): Observable<ResponseService> {
        return this.http.post<ResponseService>(this.basePathDeletePedido, pedido);
    }

    guardarDocumentoVenta(venta: Venta): Observable<any> {
        return this.http.post<any>(this.basePathGragaDocumentoVenta, venta);
    }

}