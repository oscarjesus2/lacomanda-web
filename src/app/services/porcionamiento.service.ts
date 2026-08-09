import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ConfiguracionPorcionamiento,
  ConfiguracionPorcionamientoGuardar,
  Porcionamiento,
  PorcionamientoCatalogos,
  PorcionamientoGuardar,
  PorcionamientoResumen
} from '../models/porcionamiento.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PorcionamientoService {
  private readonly basePath = `${environment.apiUrl}/porcionamientos`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: {
    FechaInicio?: Date | string | null;
    FechaFin?: Date | string | null;
    IdSubAreaAlmacen?: number | null;
    Estado?: number | null;
    Buscar?: string;
  }): Observable<ApiResponse<PorcionamientoResumen[]>> {
    let params = new HttpParams();
    if (filtro.FechaInicio) {
      params = params.set('FechaInicio', this.fechaParaApi(filtro.FechaInicio));
    }
    if (filtro.FechaFin) {
      params = params.set('FechaFin', this.fechaParaApi(filtro.FechaFin));
    }
    if (filtro.IdSubAreaAlmacen) {
      params = params.set('IdSubAreaAlmacen', filtro.IdSubAreaAlmacen);
    }
    if (filtro.Estado) {
      params = params.set('Estado', filtro.Estado);
    }
    if (filtro.Buscar?.trim()) {
      params = params.set('Buscar', filtro.Buscar.trim());
    }
    return this.http.get<ApiResponse<PorcionamientoResumen[]>>(this.basePath, { params });
  }

  obtener(id: number): Observable<ApiResponse<Porcionamiento>> {
    return this.http.get<ApiResponse<Porcionamiento>>(`${this.basePath}/${id}`);
  }

  catalogos(): Observable<ApiResponse<PorcionamientoCatalogos>> {
    return this.http.get<ApiResponse<PorcionamientoCatalogos>>(`${this.basePath}/catalogos`);
  }

  crear(dto: PorcionamientoGuardar): Observable<ApiResponse<Porcionamiento>> {
    return this.http.post<ApiResponse<Porcionamiento>>(this.basePath, dto);
  }

  anular(id: number): Observable<ApiResponse<Porcionamiento>> {
    return this.http.post<ApiResponse<Porcionamiento>>(`${this.basePath}/${id}/anular`, {});
  }

  guardarConfiguracion(
    dto: ConfiguracionPorcionamientoGuardar
  ): Observable<ApiResponse<ConfiguracionPorcionamiento>> {
    return this.http.put<ApiResponse<ConfiguracionPorcionamiento>>(
      `${this.basePath}/configuraciones`, dto
    );
  }

  eliminarConfiguracion(idProductoOrigen: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.basePath}/configuraciones/${idProductoOrigen}`
    );
  }

  private fechaParaApi(value: Date | string): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  }
}
