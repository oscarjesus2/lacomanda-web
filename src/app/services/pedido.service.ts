import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { PedidoCab } from '../models/pedido.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/ApiResponse.interface';
import { PedidoMesaDTO } from '../interfaces/pedidomesaDTO.interface';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';
import { AnularProductoYComplementoDTO } from '../interfaces/anularProductoYComplementoDTO.interface';
import { PedidoDeliveryDTO } from '../interfaces/pedidoDTO.interface';
import { DividirCuentaDTO } from '../interfaces/CrearCuentaDTO.interface';

@Injectable({
    providedIn: 'root'
})
export class PedidoService {

    
    private basePath = environment.apiUrl + '/pedido';

    constructor(private http: HttpClient) { }

    Totalapagar_x_detallepedido(idPedidoCobrar: number, nroCuentaCobrar: number): Observable<any[]> {
        return this.http.get<any[]>(this.basePath + '/totalapagar_x_detallepedido/' +  idPedidoCobrar + '/' + nroCuentaCobrar);
    }

    FindPedidoByIdPedidoNroCuenta(idPedido: number, nroCuenta: number): Observable<ApiResponse<PedidoMesaDTO[]>> {
        return this.http.get<ApiResponse<PedidoMesaDTO[]>>(`${this.basePath}/custom/${idPedido}/${nroCuenta}`);
    }

    FindPedidoByIdMesa(idMesa: string): Observable<ApiResponse<PedidoMesaDTO[]>> {
        return this.http.get<ApiResponse<PedidoMesaDTO[]>>(this.basePath + '/custom/mesa/' + idMesa);
    }

    FindPedidoByIdPedido(idPedido: number): Observable<ApiResponse<PedidoMesaDTO[]>> {
        return this.http.get<ApiResponse<PedidoMesaDTO[]>>(`${this.basePath}/custom/${idPedido}`);
    }

    ObtenerPedidosByIdTurno(idTurno: number): Observable<ApiResponse<PedidoDeliveryDTO[]>> {
        return this.http.get<ApiResponse<PedidoDeliveryDTO[]>>(this.basePath + '/turno/' + idTurno);
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
    
    GrabarPedido(pedido: PedidoCab): Observable<ApiResponse<ImpresionDTO[]>>{
        return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + '/grabarpedido', pedido);
    }

    CrearCuenta(crearCuentaDTO: DividirCuentaDTO): Observable<ApiResponse<PedidoMesaDTO[]>>{
        return this.http.post<ApiResponse<PedidoMesaDTO[]>>(this.basePath + '/CrearCuenta', crearCuentaDTO);
    }

    EliminarCuenta(eliminarCuentaDTO: DividirCuentaDTO): Observable<ApiResponse<PedidoMesaDTO[]>>{
        return this.http.post<ApiResponse<PedidoMesaDTO[]>>(this.basePath + '/EliminarCuenta', eliminarCuentaDTO);
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