import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { MotivoSalidaGuardar, MotivoSalidaMantenimiento } from '../models/motivo-salida.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MotivoSalidaService {
  private readonly basePath = `${environment.apiUrl}/motivos-salida`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<MotivoSalidaMantenimiento[]>> {
    return this.http.get<ApiResponse<MotivoSalidaMantenimiento[]>>(this.basePath);
  }

  crear(dto: MotivoSalidaGuardar): Observable<ApiResponse<MotivoSalidaMantenimiento>> {
    return this.http.post<ApiResponse<MotivoSalidaMantenimiento>>(this.basePath, dto);
  }

  actualizar(id: number, dto: MotivoSalidaGuardar): Observable<ApiResponse<MotivoSalidaMantenimiento>> {
    return this.http.put<ApiResponse<MotivoSalidaMantenimiento>>(`${this.basePath}/${id}`, dto);
  }

  eliminar(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
  }
}
