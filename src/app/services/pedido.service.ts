import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { PedidoCab } from '../models/pedido.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { PedidoEspacioDTO as PedidoEspacioDTO } from '../interfaces/pedidoespacioDTO.interface';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';
import { AnularProductoYComplementoDTO } from '../interfaces/anularProductoYComplementoDTO.interface';
import { PedidoDeliveryDTO } from '../interfaces/pedidoDTO.interface';
import { DividirCuentaDTO } from '../interfaces/dividircuentaDTO.interface';
import { PedidoDescuentoDTO } from '../interfaces/pedidoDescuentoDTO.interface';
import { TrasladarProductoDTO } from '../interfaces/trasladarProductoDTO.interface';
import { AnularPedidoPendienteRequest } from '../interfaces/cerrarTurno.interface';

@Injectable({
    providedIn: 'root'
})
export class PedidoService {

    
    private basePath = environment.apiUrl + '/pedido';

    constructor(private http: HttpClient) { }

    Totalapagar_x_detallepedido(idPedidoCobrar: number, nroCuentaCobrar: number): Observable<any[]> {
        return this.http.get<any[]>(this.basePath + '/totalapagar_x_detallepedido/' +  idPedidoCobrar + '/' + nroCuentaCobrar);
    }

    FindPedidoByIdPedidoNroCuenta(idPedido: number, nroCuenta: number): Observable<ApiResponse<PedidoEspacioDTO[]>> {
        return this.http.get<ApiResponse<PedidoEspacioDTO[]>>(`${this.basePath}/custom/${idPedido}/${nroCuenta}`);
    }

    FindPedidoByIdEspacio(idEspacio: number): Observable<ApiResponse<PedidoEspacioDTO[]>> {
        return this.http.get<ApiResponse<PedidoEspacioDTO[]>>(this.basePath + '/custom/mesa/' + idEspacio);
    }

    FindPedidoByIdPedido(idPedido: number): Observable<ApiResponse<PedidoEspacioDTO[]>> {
        return this.http.get<ApiResponse<PedidoEspacioDTO[]>>(`${this.basePath}/custom/${idPedido}`);
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

    AplicarDescuento(pedidoDescuentoDTO: PedidoDescuentoDTO): Observable<ApiResponse<boolean>> {
        console.log(pedidoDescuentoDTO);
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/AplicarDescuento`, pedidoDescuentoDTO);
    }

    QuitarDescuento(idPedido: number, nroCuenta: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/QuitarDescuento/${idPedido}/${nroCuenta}`, {});
    }
    
    ActualizarNumAnulaPedidoImpresion(idPedido: number, nroCuenta: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/ActualizarNumAnulaPedidoImpresion/${idPedido}/${nroCuenta}`, {});
    }
    
    GrabarPedido(pedido: PedidoCab): Observable<ApiResponse<ImpresionDTO[]>>{
        return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + '/grabarpedido', pedido);
    }

    CrearCuenta(crearCuentaDTO: DividirCuentaDTO): Observable<ApiResponse<PedidoEspacioDTO[]>>{
        return this.http.post<ApiResponse<PedidoEspacioDTO[]>>(this.basePath + '/CrearCuenta', crearCuentaDTO);
    }

    EliminarCuenta(eliminarCuentaDTO: DividirCuentaDTO): Observable<ApiResponse<PedidoEspacioDTO[]>>{
        return this.http.post<ApiResponse<PedidoEspacioDTO[]>>(this.basePath + '/EliminarCuenta', eliminarCuentaDTO);
    }

    AnularProductoYComplemento(pedido: AnularProductoYComplementoDTO): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + '/AnularProductoYComplemento', pedido);
    }

    AnularPedido(idEspacio: number, usuAnula: number, motivoAnula: string, ip: string): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.post<ApiResponse<ImpresionDTO[]>>(`${this.basePath}/AnularPedido/${idEspacio}/${usuAnula}/${motivoAnula}/${ip}`, {});
    }

    AnularPedidoPendiente(request: AnularPedidoPendienteRequest): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.post<ApiResponse<ImpresionDTO[]>>(
            `${this.basePath}/AnularPedidoPendiente`,
            request
        );
    }

    ImprimirPrecuenta(idPedido: number, nroCuenta: number): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.get<ApiResponse<ImpresionDTO[]>>(`${this.basePath}/ImprimirPrecuenta/${idPedido}/${nroCuenta}`);
    }

    TrasladarProducto(dto: TrasladarProductoDTO): Observable<ApiResponse<string>> {
        return this.http.post<ApiResponse<string>>(`${this.basePath}/TrasladarProducto`, dto);
    }

    // TODO: backend debe implementar PUT /api/pedido/CambiarMozo/{idPedido}/{nroCuenta}/{idEmpleado}
    CambiarMozo(idPedido: number, nroCuenta: number, idEmpleado: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/CambiarMozo/${idPedido}/${nroCuenta}/${idEmpleado}`, {});
    }

    /** Cambia el canal de venta del pedido a ESPACIO y le asigna el idEspacio dado.
     *  PUT /api/pedido/TrasladarAEspacio/{idPedido}/{idEspacio} */
    TrasladarAEspacio(idPedido: number, idEspacio: number): Observable<ApiResponse<boolean>> {
        return this.http.put<ApiResponse<boolean>>(`${this.basePath}/TrasladarAEspacio/${idPedido}/${idEspacio}`, {});
    }
}
