import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Descuento, DescuentoCreateDto } from '../models/descuento.models';

@Injectable({
  providedIn: 'root'
})
export class DescuentoService {
  private basePath = environment.apiUrl + '/Descuento';

  constructor(private http: HttpClient) {}

  getDescuentos(): Observable<ApiResponse<Descuento[]>> {
    return this.http.get<ApiResponse<Descuento[]>>(this.basePath);
  }

  crearDescuento(dto: DescuentoCreateDto): Observable<ApiResponse<Descuento>> {
    return this.http.post<ApiResponse<Descuento>>(this.basePath, dto);
  }

  actualizarDescuento(idDescuento: number, dto: DescuentoCreateDto): Observable<ApiResponse<Descuento>> {
    return this.http.put<ApiResponse<Descuento>>(`${this.basePath}/${idDescuento}`, dto);
  }

  desactivarDescuento(idDescuento: number): Observable<ApiResponse<Descuento>> {
    return this.http.patch<ApiResponse<Descuento>>(`${this.basePath}/${idDescuento}/desactivar`, {});
  }

  eliminarDescuento(idDescuento: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${idDescuento}`);
  }
}
