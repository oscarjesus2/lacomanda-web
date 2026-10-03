import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  AeatEnvioMonitorResultado,
  ConsultarAeatEnvioMonitorRequest,
  ReintentarEnviosAeatResultado,
  SubsanarRegistroAeatResultado,
} from 'src/app/models/aeat-envio-monitor.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AeatEnvioMonitorService {
  private readonly basePath = `${environment.apiUrl}/administracion/envios-aeat`;

  constructor(private readonly http: HttpClient) {}

  get(
    request: ConsultarAeatEnvioMonitorRequest,
  ): Observable<ApiResponse<AeatEnvioMonitorResultado>> {
    let params = new HttpParams()
      .set('FechaDesde', request.FechaDesde)
      .set('FechaHasta', request.FechaHasta);

    if (request.Busqueda?.trim()) {
      params = params.set('Busqueda', request.Busqueda.trim());
    }

    return this.http.get<ApiResponse<AeatEnvioMonitorResultado>>(
      this.basePath,
      { params },
    );
  }

  reintentar(
    idVentas: number[],
    operacion: 'ALTA' | 'ANULACION',
  ): Observable<ApiResponse<ReintentarEnviosAeatResultado>> {
    return this.http.post<ApiResponse<ReintentarEnviosAeatResultado>>(
      `${this.basePath}/reintentos`,
      { IdVentas: idVentas, Operacion: operacion },
    );
  }

  subsanar(
    idRegistro: number,
  ): Observable<ApiResponse<SubsanarRegistroAeatResultado>> {
    return this.http.post<ApiResponse<SubsanarRegistroAeatResultado>>(
      `${this.basePath}/registros/${idRegistro}/subsanaciones`,
      {},
    );
  }
}
