import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ConsumoAreaReporte,
  VentaCostoReporte
} from 'src/app/models/reportes-almacen.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportesAlmacenService {
  private readonly basePath = `${environment.apiUrl}/reportes-almacen`;

  constructor(private readonly http: HttpClient) {}

  consultarConsumoArea(
    fechaDesde: string,
    fechaHasta: string,
    idSubAreaAlmacen?: number
  ): Observable<ApiResponse<ConsumoAreaReporte>> {
    let params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    if (idSubAreaAlmacen) {
      params = params.set('IdSubAreaAlmacen', idSubAreaAlmacen);
    }

    return this.http.get<ApiResponse<ConsumoAreaReporte>>(
      `${this.basePath}/consumo-area`,
      { params }
    );
  }

  consultarVentaCosto(
    fechaDesde: string,
    fechaHasta: string
  ): Observable<ApiResponse<VentaCostoReporte>> {
    const params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    return this.http.get<ApiResponse<VentaCostoReporte>>(
      `${this.basePath}/venta-costo`,
      { params }
    );
  }
}
