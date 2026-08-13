import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ComparativoVentasDashboard,
  EvolucionMargenDashboard,
  MetodosPagoDashboard
} from '../models/dashboard-ejecutivo.models';

@Injectable({ providedIn: 'root' })
export class DashboardReportesService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard-reportes`;

  constructor(private readonly http: HttpClient) {}

  obtenerComparativoVentas(
    fechaDesde: string,
    fechaHasta: string
  ): Observable<ComparativoVentasDashboard> {
    return this.http
      .get<ApiResponse<ComparativoVentasDashboard>>(
        `${this.baseUrl}/comparativo-ventas`,
        { params: this.crearParametros(fechaDesde, fechaHasta) }
      )
      .pipe(map(respuesta => respuesta.Data));
  }

  obtenerEvolucionMargen(
    fechaDesde: string,
    fechaHasta: string
  ): Observable<EvolucionMargenDashboard> {
    return this.http
      .get<ApiResponse<EvolucionMargenDashboard>>(
        `${this.baseUrl}/evolucion-margen`,
        { params: this.crearParametros(fechaDesde, fechaHasta) }
      )
      .pipe(map(respuesta => respuesta.Data));
  }

  obtenerMetodosPago(
    fechaDesde: string,
    fechaHasta: string
  ): Observable<MetodosPagoDashboard> {
    return this.http
      .get<ApiResponse<MetodosPagoDashboard>>(
        `${this.baseUrl}/metodos-pago`,
        { params: this.crearParametros(fechaDesde, fechaHasta) }
      )
      .pipe(map(respuesta => respuesta.Data));
  }

  private crearParametros(fechaDesde: string, fechaHasta: string): HttpParams {
    return new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
  }
}
