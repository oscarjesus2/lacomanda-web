import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ComprobantePublico,
  ConfiguracionComprobantesPublicos,
  ConsultarComprobantePublicoRequest,
  SucursalComprobantePublico
} from 'src/app/models/comprobantes-publicos.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ComprobantesPublicosService {
  private readonly path = `${environment.apiUrl}/public/comprobantes`;
  private tenantId = '';

  constructor(private readonly http: HttpClient) {}

  listarSucursales(): Observable<ApiResponse<SucursalComprobantePublico[]>> {
    return this.http.get<ApiResponse<SucursalComprobantePublico[]>>(
      `${this.path}/sucursales`,
      { headers: this.headers(false) }
    );
  }

  seleccionarSucursal(tenantId: string): void {
    this.tenantId = tenantId.trim();
  }

  obtenerConfiguracion(): Observable<ApiResponse<ConfiguracionComprobantesPublicos>> {
    return this.http.get<ApiResponse<ConfiguracionComprobantesPublicos>>(
      `${this.path}/configuracion`,
      { headers: this.headers() }
    );
  }

  consultar(request: ConsultarComprobantePublicoRequest): Observable<ApiResponse<ComprobantePublico>> {
    return this.http.post<ApiResponse<ComprobantePublico>>(
      `${this.path}/consultar`,
      request,
      { headers: this.headers() }
    );
  }

  descargar(
    formato: 'pdf' | 'xml',
    request: ConsultarComprobantePublicoRequest
  ): Observable<Blob> {
    return this.http.post(`${this.path}/descargar/${formato}`, request, {
      headers: this.headers(),
      responseType: 'blob'
    });
  }

  private headers(incluirTenant = true): HttpHeaders {
    let headers = new HttpHeaders({ 'X-Tenant-Host': window.location.hostname });
    if (incluirTenant && this.tenantId) {
      headers = headers.set('X-Tenant-Id', this.tenantId);
    }
    return headers;
  }
}
