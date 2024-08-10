import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, Observable, throwError } from 'rxjs';
import { ventadiariasemanalmensual } from '../models/ventadiariasemanalmensual.models';
import { environment } from 'src/environments/environment';
import { ventasInterface } from '../interfaces/ventas.interface';
import { Venta } from '../models/venta.models';
import { Cliente } from '../models/cliente.models';
import { PedidoCab } from '../models/pedido.models';
import { PedidoDet } from '../models/pedidodet.models';
import { Pago } from '../models/pago.models';

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
    getListadoVentas(idTurno: number): Observable<ventasInterface[]> {
        return this.http.get<ventasInterface[]>(this.basePath+ 'Listado/' + idTurno);
    }
    guardarDocumentoVenta(idModuloVenta: number, venta: Venta, cliente: Cliente, pedidoCab: PedidoCab, listaPago: Pago[],  bTurnoIndependiente: boolean): Observable<Venta> {

        const body = {
            idModuloVenta: idModuloVenta,
            venta: venta,
            cliente: cliente,
            pedidoCab: pedidoCab,
            listaPago: listaPago,
            bTurnoIndependiente: bTurnoIndependiente
        };

        return this.http.post<Venta>(this.basePath + 'grabardocumentoventa', body);
    }
}
