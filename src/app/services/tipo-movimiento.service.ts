import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  SubTipoMovimientoGuardar,
  SubTipoMovimientoMantenimiento,
  TipoMovimientoGuardar,
  TipoMovimientoMantenimiento,
} from '../models/tipo-movimiento.models';

@Injectable({ providedIn: 'root' })
export class TipoMovimientoService {
  private readonly basePath = `${environment.apiUrl}/tipos-movimiento`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<TipoMovimientoMantenimiento[]>> {
    return this.http.get<ApiResponse<TipoMovimientoMantenimiento[]>>(
      this.basePath,
    );
  }

  crearTipo(
    dto: TipoMovimientoGuardar,
  ): Observable<ApiResponse<TipoMovimientoMantenimiento>> {
    return this.http.post<ApiResponse<TipoMovimientoMantenimiento>>(
      this.basePath,
      dto,
    );
  }

  actualizarTipo(
    idTipoMovimiento: number,
    dto: TipoMovimientoGuardar,
  ): Observable<ApiResponse<TipoMovimientoMantenimiento>> {
    return this.http.put<ApiResponse<TipoMovimientoMantenimiento>>(
      `${this.basePath}/${idTipoMovimiento}`,
      dto,
    );
  }

  eliminarTipo(idTipoMovimiento: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.basePath}/${idTipoMovimiento}`,
    );
  }

  crearSubTipo(
    idTipoMovimiento: number,
    dto: SubTipoMovimientoGuardar,
  ): Observable<ApiResponse<SubTipoMovimientoMantenimiento>> {
    return this.http.post<ApiResponse<SubTipoMovimientoMantenimiento>>(
      `${this.basePath}/${idTipoMovimiento}/subtipos`,
      dto,
    );
  }

  actualizarSubTipo(
    idSubTipoMovimiento: number,
    dto: SubTipoMovimientoGuardar,
  ): Observable<ApiResponse<SubTipoMovimientoMantenimiento>> {
    return this.http.put<ApiResponse<SubTipoMovimientoMantenimiento>>(
      `${this.basePath}/subtipos/${idSubTipoMovimiento}`,
      dto,
    );
  }

  eliminarSubTipo(
    idSubTipoMovimiento: number,
  ): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.basePath}/subtipos/${idSubTipoMovimiento}`,
    );
  }
}
