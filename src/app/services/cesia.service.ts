import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { ConsultarCesiaRequest, RespuestaCesia } from '../models/cesia.models';

@Injectable({ providedIn: 'root' })
export class CesiaService {
  private readonly path = `${environment.apiUrl}/cesia/chat`;

  constructor(private readonly http: HttpClient) {}

  consultar(request: ConsultarCesiaRequest): Observable<RespuestaCesia> {
    return this.http
      .post<ApiResponse<RespuestaCesia>>(this.path, request)
      .pipe(map(response => response.Data));
  }
}
