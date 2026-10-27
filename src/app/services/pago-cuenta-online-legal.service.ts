import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  InformacionLegalPagoPublica,
  LibroReclamacionRegistrado,
  RegistrarLibroReclamacionPublico,
} from '../models/pago-cuenta-online-legal.models';

@Injectable({ providedIn: 'root' })
export class PagoCuentaOnlineLegalService {
  private readonly baseUrl = `${environment.apiUrl}/public/pago-cuenta/legal`;

  constructor(private readonly http: HttpClient) {}

  obtenerInformacion(): Observable<ApiResponse<InformacionLegalPagoPublica>> {
    return this.http.get<ApiResponse<InformacionLegalPagoPublica>>(
      this.baseUrl,
      { headers: this.publicHeaders() },
    );
  }

  registrarLibroReclamaciones(
    request: RegistrarLibroReclamacionPublico,
  ): Observable<ApiResponse<LibroReclamacionRegistrado>> {
    return this.http.post<ApiResponse<LibroReclamacionRegistrado>>(
      `${this.baseUrl}/libro-reclamaciones`,
      request,
      { headers: this.publicHeaders() },
    );
  }

  private publicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Tenant-Host': window.location.hostname,
      'X-LaComanda-Public-Request': 'true',
    });
  }
}
