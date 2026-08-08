import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ConfirmarTrabajoImpresionRequest,
  FallarTrabajoImpresionRequest,
  ReclamarTrabajosImpresionRequest,
  TrabajoImpresion,
} from '../models/trabajo-impresion.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class TrabajosImpresionService {
  private readonly basePath = `${environment.apiUrl}/trabajos-impresion`;

  constructor(private readonly http: HttpClient) {}

  reclamar(
    request: ReclamarTrabajosImpresionRequest,
  ): Observable<ApiResponse<TrabajoImpresion[]>> {
    return this.http.post<ApiResponse<TrabajoImpresion[]>>(
      `${this.basePath}/reclamar`,
      request,
    );
  }

  confirmar(
    idTrabajoImpresion: number,
    request: ConfirmarTrabajoImpresionRequest,
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.basePath}/${idTrabajoImpresion}/confirmar`,
      request,
    );
  }

  fallar(
    idTrabajoImpresion: number,
    request: FallarTrabajoImpresionRequest,
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.basePath}/${idTrabajoImpresion}/fallar`,
      request,
    );
  }
}
