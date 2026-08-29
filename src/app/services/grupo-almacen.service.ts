import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  GrupoAlmacen,
  GrupoAlmacenGuardar,
  TipoGrupoAlmacen,
} from '../models/grupo-almacen.models';
import { environment } from 'src/environments/environment';

/**
 * Grupos de almacén (insumos y artículos).
 *
 * Endpoint distinto al de `GrupoService` aunque compartan tabla: este va detrás
 * de `almacen.gestion` y no de `operacion.caja`, de modo que un restaurante con
 * plan de solo almacén puede mantener sus grupos.
 */
@Injectable({ providedIn: 'root' })
export class GrupoAlmacenService {
  private readonly basePath = `${environment.apiUrl}/grupo-almacen`;

  constructor(private readonly http: HttpClient) {}

  /** Sin tipo devuelve insumos y artículos. */
  listar(tipoGrupo?: TipoGrupoAlmacen): Observable<ApiResponse<GrupoAlmacen[]>> {
    const params = tipoGrupo
      ? new HttpParams().set('tipoGrupo', tipoGrupo)
      : undefined;
    return this.http.get<ApiResponse<GrupoAlmacen[]>>(this.basePath, { params });
  }

  crear(dto: GrupoAlmacenGuardar): Observable<ApiResponse<GrupoAlmacen>> {
    return this.http.post<ApiResponse<GrupoAlmacen>>(this.basePath, dto);
  }

  actualizar(
    id: number,
    dto: GrupoAlmacenGuardar,
  ): Observable<ApiResponse<GrupoAlmacen>> {
    return this.http.put<ApiResponse<GrupoAlmacen>>(
      `${this.basePath}/${id}`,
      dto,
    );
  }

  eliminar(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
  }
}
