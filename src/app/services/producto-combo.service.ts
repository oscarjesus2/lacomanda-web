import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  GuardarProductoComboSeccion,
  ProductoComboCatalogo,
  ProductoComboConfiguracion,
  ProductoComboSeccion,
} from '../models/producto-combo.models';

@Injectable({
  providedIn: 'root'
})
export class ProductoComboService {
  private readonly basePath = `${environment.apiUrl}/producto-combo`;

  constructor(private readonly http: HttpClient) {}

  obtenerCatalogo(): Observable<ApiResponse<ProductoComboCatalogo>> {
    return this.http.get<ApiResponse<ProductoComboCatalogo>>(
      `${this.basePath}/catalogo`
    );
  }

  obtenerConfiguracion(
    idProducto: number
  ): Observable<ApiResponse<ProductoComboConfiguracion>> {
    return this.http.get<ApiResponse<ProductoComboConfiguracion>>(
      `${this.basePath}/${idProducto}`
    );
  }

  guardarSeccion(
    idProducto: number,
    idSeccionMenu: number,
    dto: GuardarProductoComboSeccion
  ): Observable<ApiResponse<ProductoComboSeccion>> {
    return this.http.put<ApiResponse<ProductoComboSeccion>>(
      `${this.basePath}/${idProducto}/secciones/${idSeccionMenu}`,
      dto
    );
  }

  eliminarSeccion(
    idProducto: number,
    idSeccionMenu: number
  ): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.basePath}/${idProducto}/secciones/${idSeccionMenu}`
    );
  }
}
