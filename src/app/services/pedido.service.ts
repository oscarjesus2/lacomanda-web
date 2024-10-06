import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { PedidoCab } from '../models/pedido.models';
import { ResponseService } from '../models/response.services';
import { Venta } from '../models/venta.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from '../interfaces/pedidomesaDTO.interface';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';
import { AnularProductoYComplementoDTO } from '../interfaces/anularProductoYComplementoDTO.interface';

@Injectable({
    providedIn: 'root'
})
export class PedidoService {

    
    private basePath = environment.apiUrl + '/pedido';
    private basePathConsultarMesa = environment.apiUrl +  '/venta/ConsultarMesa';
 
    constructor(private http: HttpClient) { }

    totalapagar_x_detallepedido(idPedidoCobrar: number, nroCuentaCobrar: number): Observable<any[]> {
        return this.http.get<any[]>(this.basePath + '/totalapagar_x_detallepedido/' +  idPedidoCobrar + '/' + nroCuentaCobrar);
    }

    findPedidoMesaByIdMesa(idMesa: string): Observable<ApiResponse<PedidoMesaDTO[]>> {
        return this.http.get<ApiResponse<PedidoMesaDTO[]>>(this.basePath + '/listarpedido_x_mesa/' + idMesa);
    }
    
    findMesaById(idMesa: string): Observable<any[]> {
        return this.http.get<any[]>(this.basePathConsultarMesa + idMesa);
    }

    ActualizarEnviosDeImpresion(idPedido: number, nroCuenta: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/ActualizarEnviosDeImpresion/${idPedido}/${nroCuenta}`, {});
    }
    
    ActualizarNumAnulaItemImpresion(idPedido: number, item: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/ActualizarNumAnulaItemImpresion/${idPedido}/${item}`, {});
    }

    ActualizarNumAnulaPedidoImpresion(idPedido: number, nroCuenta: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/ActualizarNumAnulaPedidoImpresion/${idPedido}/${nroCuenta}`, {});
    }
    
    RegistrarPedido(pedido: PedidoCab): Observable<ApiResponse<ImpresionDTO[]>>{
        return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + '/grabarpedido', pedido);
    }

    AnularProductoYComplemento(pedido: AnularProductoYComplementoDTO): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + '/AnularProductoYComplemento', pedido);
    }

    AnularPedido(idMesa: string, usuAnula: number, motivoAnula: string, ip: string): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.post<ApiResponse<ImpresionDTO[]>>(`${this.basePath}/AnularPedido/${idMesa}/${usuAnula}/${motivoAnula}/${ip}`, {});
    }

    ImprimirPrecuenta(idPedido: number, nroCuenta: number): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.get<ApiResponse<ImpresionDTO[]>>(`${this.basePath}/ImprimirPrecuenta/${idPedido}/${nroCuenta}`);
    }
}