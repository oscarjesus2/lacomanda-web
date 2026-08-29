import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  CoberturaStockReporte,
  ConsumoAreaReporte,
  ConsumoTeoricoRealReporte,
  RentabilidadProductoCanalReporte,
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

  consultarConsumoTeoricoReal(
    fechaDesde: string,
    fechaHasta: string,
    idSubAreaAlmacen?: number
  ): Observable<ApiResponse<ConsumoTeoricoRealReporte>> {
    let params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    if (idSubAreaAlmacen) {
      params = params.set('IdSubAreaAlmacen', idSubAreaAlmacen);
    }

    return this.http.get<ApiResponse<ConsumoTeoricoRealReporte>>(
      `${this.basePath}/consumo-teorico-real`,
      { params }
    );
  }

  consultarRentabilidadProductoCanal(
    fechaDesde: string,
    fechaHasta: string,
    idCanalVenta?: number
  ): Observable<ApiResponse<RentabilidadProductoCanalReporte>> {
    let params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    if (idCanalVenta) {
      params = params.set('IdCanalVenta', idCanalVenta);
    }

    return this.http.get<ApiResponse<RentabilidadProductoCanalReporte>>(
      `${this.basePath}/rentabilidad-producto-canal`,
      { params }
    );
  }

  consultarCoberturaStock(
    fechaDesde: string,
    fechaHasta: string
  ): Observable<ApiResponse<CoberturaStockReporte>> {
    const params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    return this.http.get<ApiResponse<CoberturaStockReporte>>(
      `${this.basePath}/cobertura-stock`,
      { params }
    );
  }
}
