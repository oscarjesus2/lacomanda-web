
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import {
  SocioNegocio,
  SocioNegocioSave
} from '../models/socionegocio.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class SocioNegocioService {
  private readonly basePath = environment.apiUrl + '/SocioNegocio';

  constructor(private http: HttpClient) {}

  getSocioNegocios(
    incluirInactivos = false
  ): Observable<ApiResponse<SocioNegocio[]>> {
    return this.http.get<ApiResponse<SocioNegocio[]>>(
      this.basePath,
      { params: { incluirInactivos } }
    );
  }

  getById(idSocioNegocio: number): Observable<ApiResponse<SocioNegocio>> {
    return this.http.get<ApiResponse<SocioNegocio>>(
      `${this.basePath}/${idSocioNegocio}`
    );
  }

  crear(dto: SocioNegocioSave): Observable<ApiResponse<SocioNegocio>> {
    return this.http.post<ApiResponse<SocioNegocio>>(this.basePath, dto);
  }

  actualizar(
    idSocioNegocio: number,
    dto: SocioNegocioSave
  ): Observable<ApiResponse<SocioNegocio>> {
    return this.http.put<ApiResponse<SocioNegocio>>(
      `${this.basePath}/${idSocioNegocio}`,
      dto
    );
  }

  eliminar(idSocioNegocio: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.basePath}/${idSocioNegocio}`
    );
  }
}
