import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  Produccion,
  ProduccionCatalogos,
  ProduccionGuardar,
  ProduccionResumen,
  RecetaProduccion,
  RecetaProduccionGuardar,
  RecetaProduccionResumen
} from '../models/produccion.models';
import { environment } from 'src/environments/environment';
import { FechaFiltro, fechaFiltroParaApi } from '../shared/fechas/fecha-filtro';

@Injectable({ providedIn: 'root' })
export class ProduccionService {
  private readonly produccionesPath = `${environment.apiUrl}/producciones`;
  private readonly recetasPath = `${environment.apiUrl}/recetas-produccion`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: {
    FechaInicio?: FechaFiltro | null;
    FechaFin?: FechaFiltro | null;
    Estado?: number | null;
    Buscar?: string;
  }): Observable<ApiResponse<ProduccionResumen[]>> {
    let params = new HttpParams();
    if (filtro.FechaInicio) {
      params = params.set('FechaInicio', fechaFiltroParaApi(filtro.FechaInicio));
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
    return this.http.get<ApiResponse<ProduccionResumen[]>>(this.produccionesPath, { params });
  }

  obtener(id: number): Observable<ApiResponse<Produccion>> {
    return this.http.get<ApiResponse<Produccion>>(`${this.produccionesPath}/${id}`);
  }

  catalogos(): Observable<ApiResponse<ProduccionCatalogos>> {
    return this.http.get<ApiResponse<ProduccionCatalogos>>(`${this.produccionesPath}/catalogos`);
  }

  crear(dto: ProduccionGuardar): Observable<ApiResponse<Produccion>> {
    return this.http.post<ApiResponse<Produccion>>(this.produccionesPath, dto);
  }

  actualizar(id: number, dto: ProduccionGuardar): Observable<ApiResponse<Produccion>> {
    return this.http.put<ApiResponse<Produccion>>(`${this.produccionesPath}/${id}`, dto);
  }

  revisar(id: number): Observable<ApiResponse<Produccion>> {
    return this.http.post<ApiResponse<Produccion>>(`${this.produccionesPath}/${id}/revisar`, {});
  }

  anular(id: number): Observable<ApiResponse<Produccion>> {
    return this.http.post<ApiResponse<Produccion>>(`${this.produccionesPath}/${id}/anular`, {});
  }

  listarRecetas(): Observable<ApiResponse<RecetaProduccionResumen[]>> {
    return this.http.get<ApiResponse<RecetaProduccionResumen[]>>(this.recetasPath);
  }

  obtenerReceta(id: number): Observable<ApiResponse<RecetaProduccion>> {
    return this.http.get<ApiResponse<RecetaProduccion>>(`${this.recetasPath}/${id}`);
  }

  crearReceta(dto: RecetaProduccionGuardar): Observable<ApiResponse<RecetaProduccion>> {
    return this.http.post<ApiResponse<RecetaProduccion>>(this.recetasPath, dto);
  }

  actualizarReceta(id: number, dto: RecetaProduccionGuardar): Observable<ApiResponse<RecetaProduccion>> {
    return this.http.put<ApiResponse<RecetaProduccion>>(`${this.recetasPath}/${id}`, dto);
  }

}
