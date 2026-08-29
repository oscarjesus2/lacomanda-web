import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Articulo, ArticuloGuardar } from '../models/articulo.models';

@Injectable({ providedIn: 'root' })
export class ArticuloService {
  private readonly basePath = `${environment.apiUrl}/articulos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<Articulo[]>> {
    return this.http.get<ApiResponse<Articulo[]>>(this.basePath);
  }

  crear(articulo: ArticuloGuardar): Observable<ApiResponse<Articulo>> {
    return this.http.post<ApiResponse<Articulo>>(this.basePath, articulo);
  }

  actualizar(articulo: ArticuloGuardar): Observable<ApiResponse<Articulo>> {
    return this.http.put<ApiResponse<Articulo>>(
      `${this.basePath}/${articulo.IdProducto}`,
      articulo
    );
  }
}
