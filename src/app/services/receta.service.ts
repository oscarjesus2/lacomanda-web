import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  Receta,
  RecetaGuardar,
  RecetaReporteFila,
  RecetaResumen
} from '../models/receta.models';

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly basePath = `${environment.apiUrl}/recetas`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<RecetaResumen[]>> {
    return this.http.get<ApiResponse<RecetaResumen[]>>(this.basePath);
  }

  obtener(idReceta: number): Observable<ApiResponse<Receta>> {
    return this.http.get<ApiResponse<Receta>>(
      `${this.basePath}/${idReceta}`
    );
  }

  crear(dto: RecetaGuardar): Observable<ApiResponse<Receta>> {
    return this.http.post<ApiResponse<Receta>>(this.basePath, dto);
  }

  actualizar(
    idReceta: number,
    dto: RecetaGuardar
  ): Observable<ApiResponse<Receta>> {
    return this.http.put<ApiResponse<Receta>>(
      `${this.basePath}/${idReceta}`,
      dto
    );
  }

  eliminar(idReceta: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.basePath}/${idReceta}`
    );
  }

  reporte(filtro: {
    idProducto?: number;
    idFamilia?: number;
    idArticulo?: number;
  }): Observable<ApiResponse<RecetaReporteFila[]>> {
    let params = new HttpParams();
    if (filtro.idProducto) {
      params = params.set('idProducto', filtro.idProducto);
    }
    if (filtro.idFamilia) {
      params = params.set('idFamilia', filtro.idFamilia);
    }
    if (filtro.idArticulo) {
      params = params.set('idArticulo', filtro.idArticulo);
    }
    return this.http.get<ApiResponse<RecetaReporteFila[]>>(
      `${this.basePath}/reporte`,
      { params }
    );
  }
}
