import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  SalidaInterna,
  SalidaInternaCatalogos,
  SalidaInternaGuardar,
  SalidaInternaResumen
} from '../models/salida-interna.models';
import { environment } from 'src/environments/environment';
import { FechaFiltro, fechaFiltroParaApi } from '../shared/fechas/fecha-filtro';

@Injectable({ providedIn: 'root' })
export class SalidaInternaService {
  private readonly basePath = `${environment.apiUrl}/salidas-internas`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: {
    FechaInicio?: FechaFiltro | null;
    FechaFin?: FechaFiltro | null;
    Estado?: number | null;
    Buscar?: string;
  }): Observable<ApiResponse<SalidaInternaResumen[]>> {
    let params = new HttpParams();
    if (filtro.FechaInicio) {
      params = params.set(
        'FechaInicio',
        fechaFiltroParaApi(filtro.FechaInicio)
      );
    }
    if (filtro.FechaFin) {
      params = params.set('FechaFin', fechaFiltroParaApi(filtro.FechaFin));
    }
    if (filtro.Estado) {
      params = params.set('Estado', filtro.Estado);
    }
    if (filtro.Buscar?.trim()) {
      params = params.set('Buscar', filtro.Buscar.trim());
    }

    return this.http.get<ApiResponse<SalidaInternaResumen[]>>(
      this.basePath,
      { params }
    );
  }

  obtener(idSalida: number): Observable<ApiResponse<SalidaInterna>> {
    return this.http.get<ApiResponse<SalidaInterna>>(
      `${this.basePath}/${idSalida}`
    );
  }

  catalogos(): Observable<ApiResponse<SalidaInternaCatalogos>> {
    return this.http.get<ApiResponse<SalidaInternaCatalogos>>(
      `${this.basePath}/catalogos`
    );
  }

  crear(dto: SalidaInternaGuardar): Observable<ApiResponse<SalidaInterna>> {
    return this.http.post<ApiResponse<SalidaInterna>>(this.basePath, dto);
  }

  actualizar(
    idSalida: number,
    dto: SalidaInternaGuardar
  ): Observable<ApiResponse<SalidaInterna>> {
    return this.http.put<ApiResponse<SalidaInterna>>(
      `${this.basePath}/${idSalida}`,
      dto
    );
  }

  revisar(idSalida: number): Observable<ApiResponse<SalidaInterna>> {
    return this.http.post<ApiResponse<SalidaInterna>>(
      `${this.basePath}/${idSalida}/revisar`,
      {}
    );
  }

  anular(idSalida: number): Observable<ApiResponse<SalidaInterna>> {
    return this.http.post<ApiResponse<SalidaInterna>>(
      `${this.basePath}/${idSalida}/anular`,
      {}
    );
  }

}
