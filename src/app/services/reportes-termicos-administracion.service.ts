import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  FiltroReporteTermicoAdministracion,
  TipoReporteTermicoAdministracion,
  TurnoReporteTermico,
} from '../models/reportes-termicos-administracion.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportesTermicosAdministracionService {
  private readonly basePath = `${environment.apiUrl}/reportes-ventas/termicos`;

  constructor(private readonly http: HttpClient) {}

  listarTurnos(
    fechaDesde: string,
    fechaHasta: string,
  ): Observable<ApiResponse<TurnoReporteTermico[]>> {
    const params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    return this.http.get<ApiResponse<TurnoReporteTermico[]>>(
      `${this.basePath}/turnos`,
      { params },
    );
  }

  generar(
    tipo: TipoReporteTermicoAdministracion,
    filtro: FiltroReporteTermicoAdministracion,
  ): Observable<ApiResponse<string>> {
    let params = new HttpParams()
      .set('FechaDesde', filtro.FechaDesde)
      .set('FechaHasta', filtro.FechaHasta);
    if (filtro.IdTurno) {
      params = params.set('IdTurno', filtro.IdTurno);
    }

    return this.http.get<ApiResponse<string>>(
      `${this.basePath}/${tipo}`,
      { params },
    );
  }
}
