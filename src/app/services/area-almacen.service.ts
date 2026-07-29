import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  AreaAlmacenGuardar,
  AreaAlmacenMaestro
} from '../models/almacen-maestro.models';
import { AreaAlmacen } from '../models/receta.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AreaAlmacenService {
  private readonly basePath = `${environment.apiUrl}/areas-almacen`;

  constructor(private readonly http: HttpClient) {}

  listarActivas(): Observable<ApiResponse<AreaAlmacen[]>> {
    return this.http.get<ApiResponse<AreaAlmacen[]>>(this.basePath);
  }

  listarTodos(): Observable<ApiResponse<AreaAlmacenMaestro[]>> {
    return this.http.get<ApiResponse<AreaAlmacenMaestro[]>>(
      `${this.basePath}/todos`
    );
  }

  crear(
    dto: AreaAlmacenGuardar
  ): Observable<ApiResponse<AreaAlmacenMaestro>> {
    return this.http.post<ApiResponse<AreaAlmacenMaestro>>(
      this.basePath,
      dto
    );
  }

  actualizar(
    idAreaAlmacen: number,
    dto: AreaAlmacenGuardar
  ): Observable<ApiResponse<AreaAlmacenMaestro>> {
    return this.http.put<ApiResponse<AreaAlmacenMaestro>>(
      `${this.basePath}/${idAreaAlmacen}`,
      dto
    );
  }
}
