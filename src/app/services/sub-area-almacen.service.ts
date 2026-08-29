import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  SubAreaAlmacen,
  SubAreaAlmacenGuardar
} from '../models/almacen-maestro.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SubAreaAlmacenService {
  private readonly basePath = `${environment.apiUrl}/subareas-almacen`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<SubAreaAlmacen[]>> {
    return this.http.get<ApiResponse<SubAreaAlmacen[]>>(this.basePath);
  }

  crear(
    dto: SubAreaAlmacenGuardar
  ): Observable<ApiResponse<SubAreaAlmacen>> {
    return this.http.post<ApiResponse<SubAreaAlmacen>>(
      this.basePath,
      dto
    );
  }

  actualizar(
    idSubAreaAlmacen: number,
    dto: SubAreaAlmacenGuardar
  ): Observable<ApiResponse<SubAreaAlmacen>> {
    return this.http.put<ApiResponse<SubAreaAlmacen>>(
      `${this.basePath}/${idSubAreaAlmacen}`,
      dto
    );
  }
}
