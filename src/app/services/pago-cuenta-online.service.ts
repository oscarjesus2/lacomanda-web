import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ActualizarConfiguracionPagoCuentaOnline,
  ConfiguracionPagoCuentaOnline,
} from '../models/pago-cuenta-online.models';

@Injectable({ providedIn: 'root' })
export class PagoCuentaOnlineService {
  private readonly url = `${environment.apiUrl}/configuracion/pago-cuenta-online`;

  constructor(private readonly http: HttpClient) {}

  obtener(): Observable<ApiResponse<ConfiguracionPagoCuentaOnline>> {
    return this.http.get<ApiResponse<ConfiguracionPagoCuentaOnline>>(this.url);
  }

  actualizar(
    request: ActualizarConfiguracionPagoCuentaOnline,
  ): Observable<ApiResponse<ConfiguracionPagoCuentaOnline>> {
    return this.http.put<ApiResponse<ConfiguracionPagoCuentaOnline>>(
      this.url,
      request,
    );
  }
}
