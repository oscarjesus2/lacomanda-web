import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, Observable, throwError } from 'rxjs';
import { ventadiariasemanalmensual } from '../models/ventadiariasemanalmensual.models';
import { environment } from 'src/environments/environment';
import { InformeContableInterface, VentasDTO, VentasInterface } from '../interfaces/ventas.interface';
import { Venta } from '../models/venta.models';
import { Cliente } from '../models/cliente.models';
import { PedidoCab } from '../models/pedido.models';
import { PedidoDet } from '../models/pedidodet.models';
import { Pago } from '../models/pago.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { DescuentoCodigo } from '../models/descuentocodigo.models';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';

@Injectable({
    providedIn: 'root'
})
export class VentaService {
    private basePath = environment.apiUrl + '/venta/';

    constructor(private http: HttpClient) { }
    getVentasPorCanal(fechaInicial: string, fechaFinal: string): Observable<ventadiariasemanalmensual[]> {
        return this.http.get<ventadiariasemanalmensual[]>(this.basePath+ 'VentasPorCanal/' + fechaInicial + '/' + fechaFinal);
    }

    getVentaDiariasSemanalMensual(tipo: number, fechaInicial: string, fechaFinal: string): Observable<ventadiariasemanalmensual[]> {
        return this.http.get<ventadiariasemanalmensual[]>(this.basePath+ 'DiariasSemanalMensual/' + tipo  + '/' + fechaInicial + '/' + fechaFinal);
    }

    getProductosMasVendidos(top: number, fechaInicial: string, fechaFinal: string): Observable<ventadiariasemanalmensual[]> {
        return this.http.get<ventadiariasemanalmensual[]>(this.basePath+ 'ProductosMasVendidos/' + top  + '/' + fechaInicial + '/' + fechaFinal);
    }

    getVentasHoraPico(tipo: number, fechaInicial: string, fechaFinal: string): Observable<ventadiariasemanalmensual[]> {
        return this.http.get<ventadiariasemanalmensual[]>(this.basePath+ 'VentasHoraPico/' + tipo  + '/' + fechaInicial + '/' + fechaFinal);
    }
    getListadoVentas(idTurno: number, incluirDI: number): Observable<VentasInterface[]> {
        return this.http.get<VentasInterface[]>(this.basePath+ 'Listado/' + idTurno + '/' + incluirDI);
    }

    getInformeContable(fechaInicial: string, fechaFinal: string, serie: string, tipoDoc: string): Observable<InformeContableInterface[]> {
        return this.http.get<InformeContableInterface[]>(this.basePath+ 'InformeContableVenta/' + fechaInicial + '/' + fechaFinal+ '/' + serie+ '/' + tipoDoc);
    }

    anularDocumentoVenta(idVenta: number, motivo: string, usuAnula: number, anularPedido: boolean):  Observable<ApiResponse<ImpresionDTO[]>>  {
        const url = `${this.basePath}anulardocumentoventa/${idVenta}/${encodeURIComponent(motivo)}/${usuAnula}/${anularPedido}`;
        return this.http.put< ApiResponse<ImpresionDTO[]>>(url, null);
      }
      
  
    guardarDocumentoVenta(idTipoPedido: string, venta: Venta, cliente: Cliente, pedidoCab: PedidoCab, listaDescuentoCodigo: DescuentoCodigo[], listaPago: Pago[],  bTurnoIndependiente: boolean): Observable<ApiResponse<ImpresionDTO[]>> {

        const body = {
            IdTipoPedido: idTipoPedido,
            venta: venta,
            cliente: cliente,
            pedidoCab: pedidoCab,
            listaDescuentoCodigo: listaDescuentoCodigo,
            listaPago: listaPago,
            bTurnoIndependiente: bTurnoIndependiente
        };

        return this.http.post<ApiResponse<ImpresionDTO[]>>(this.basePath + 'grabardocumentoventa', body);
    }

    getVentasTurno(idTurno: number): Observable<ApiResponse<VentasDTO[]>> {
        return this.http.get<ApiResponse<VentasDTO[]>>(`${this.basePath}GetVentasPorTurno/${idTurno}`);
    }

    getVentasTragoGratisTurno(idTurno: number): Observable<ApiResponse<VentasDTO[]>> {
        return this.http.get<ApiResponse<VentasDTO[]>>(`${this.basePath}GetVentasTragoGratisPorTurno/${idTurno}`);
    }

    getImpresionComprobanteVenta(idventa: number): Observable<ApiResponse<ImpresionDTO[]>> {
        return this.http.get<ApiResponse<ImpresionDTO[]>>(`${this.basePath}ImpresionComprobanteVenta/${idventa}`);
    }
}