import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';
import {
  EmitirVentaDirectaRequest,
  VentaDirectaProducto,
} from '../models/venta-directa.models';

@Injectable({ providedIn: 'root' })
export class VentaDirectaService {
  private readonly basePath = `${environment.apiUrl}/venta-directa`;

  constructor(private readonly http: HttpClient) {}

  listarProductos(): Observable<ApiResponse<VentaDirectaProducto[]>> {
    return this.http.get<ApiResponse<VentaDirectaProducto[]>>(
      `${this.basePath}/productos`,
    );
  }

  emitir(
    request: EmitirVentaDirectaRequest,
  ): Observable<ApiResponse<ImpresionDTO[]>> {
    return this.http.post<ApiResponse<ImpresionDTO[]>>(
      `${this.basePath}/emitir`,
      request,
    );
  }
}
