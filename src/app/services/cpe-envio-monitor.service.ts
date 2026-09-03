import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ConsultarCpeEnvioMonitorRequest,
  CpeEnvioMonitorResultado,
} from 'src/app/models/cpe-envio-monitor.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class CpeEnvioMonitorService {
  private readonly basePath = `${environment.apiUrl}/administracion/envios-cpe`;

  constructor(private readonly http: HttpClient) {}

  get(
    request: ConsultarCpeEnvioMonitorRequest,
  ): Observable<ApiResponse<CpeEnvioMonitorResultado>> {
    let params = new HttpParams()
      .set('FechaDesde', request.FechaDesde)
      .set('FechaHasta', request.FechaHasta);

    if (request.Busqueda?.trim()) {
      params = params.set('Busqueda', request.Busqueda.trim());
    }

    return this.http.get<ApiResponse<CpeEnvioMonitorResultado>>(
      this.basePath,
      { params },
    );
  }
}

