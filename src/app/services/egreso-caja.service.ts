import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  EgresoCajaCatalogo,
  EgresoCajaCrear,
  EgresoCajaRegistrado,
} from '../models/egreso-caja.models';

@Injectable({ providedIn: 'root' })
export class EgresoCajaService {
  private readonly basePath = `${environment.apiUrl}/egresos-caja`;

  constructor(private readonly http: HttpClient) {}

  obtenerCatalogo(): Observable<ApiResponse<EgresoCajaCatalogo>> {
    return this.http.get<ApiResponse<EgresoCajaCatalogo>>(
      `${this.basePath}/catalogo`,
    );
  }

  registrar(
    dto: EgresoCajaCrear,
  ): Observable<ApiResponse<EgresoCajaRegistrado>> {
    return this.http.post<ApiResponse<EgresoCajaRegistrado>>(
      this.basePath,
      dto,
    );
  }
}
