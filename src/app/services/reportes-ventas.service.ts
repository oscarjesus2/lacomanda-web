import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ReporteVentasRespuesta, TipoReporteVentas } from 'src/app/models/reportes-ventas.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportesVentasService {
  private readonly basePath = `${environment.apiUrl}/reportes-ventas`;

  constructor(private readonly http: HttpClient) {}

  consultar(
    tipo: TipoReporteVentas,
    fechaDesde: string,
    fechaHasta: string
  ): Observable<ApiResponse<ReporteVentasRespuesta>> {
    const params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);

    return this.http.get<ApiResponse<ReporteVentasRespuesta>>(
      `${this.basePath}/${tipo}`,
      { params }
    );
  }
}
