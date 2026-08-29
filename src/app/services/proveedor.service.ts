import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  Proveedor,
  ProveedorCatalogo,
  ProveedorGuardar
} from '../models/proveedor.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly basePath = `${environment.apiUrl}/proveedores`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<Proveedor[]>> {
    return this.http.get<ApiResponse<Proveedor[]>>(this.basePath);
  }

  catalogo(): Observable<ApiResponse<ProveedorCatalogo>> {
    return this.http.get<ApiResponse<ProveedorCatalogo>>(
      `${this.basePath}/catalogo`
    );
  }

  crear(dto: ProveedorGuardar): Observable<ApiResponse<Proveedor>> {
    return this.http.post<ApiResponse<Proveedor>>(this.basePath, dto);
  }

  actualizar(
    idProveedor: number,
    dto: ProveedorGuardar
  ): Observable<ApiResponse<Proveedor>> {
    return this.http.put<ApiResponse<Proveedor>>(
      `${this.basePath}/${idProveedor}`,
      dto
    );
  }
}
