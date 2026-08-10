import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Promocion, PromocionGuardar } from '../models/promocion.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PromocionService {
  private readonly basePath = `${environment.apiUrl}/promociones`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<Promocion[]>> {
    return this.http.get<ApiResponse<Promocion[]>>(this.basePath);
  }

  crear(dto: PromocionGuardar): Observable<ApiResponse<Promocion>> {
    return this.http.post<ApiResponse<Promocion>>(this.basePath, dto);
  }

  actualizar(id: number, dto: PromocionGuardar): Observable<ApiResponse<Promocion>> {
    return this.http.put<ApiResponse<Promocion>>(`${this.basePath}/${id}`, dto);
  }

  eliminar(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
  }
}
