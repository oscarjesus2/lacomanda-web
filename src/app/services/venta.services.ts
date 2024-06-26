import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { ventadiariasemanalmensual } from '../models/ventadiariasemanalmensual.models';
import { environment } from 'src/environments/environment';
import { ventasInterface } from '../interfaces/ventas.interface';

@Injectable({
    providedIn: 'root'
})
export class VentaService {

    private basePath = environment.apiUrl + '/ventas/';

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
}
