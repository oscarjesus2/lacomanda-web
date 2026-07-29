import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  Inventario,
  InventarioConteoGuardar,
  InventarioCrear,
  InventarioResumen,
  SubAreaAlmacenInventario
} from '../models/inventario.models';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly basePath = `${environment.apiUrl}/inventarios`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<InventarioResumen[]>> {
    return this.http.get<ApiResponse<InventarioResumen[]>>(this.basePath);
  }

  obtener(idInventario: number): Observable<ApiResponse<Inventario>> {
    return this.http.get<ApiResponse<Inventario>>(
      `${this.basePath}/${idInventario}`
    );
  }

  listarSubAreasCuadrables(): Observable<
    ApiResponse<SubAreaAlmacenInventario[]>
  > {
    return this.http.get<ApiResponse<SubAreaAlmacenInventario[]>>(
      `${this.basePath}/subareas-cuadrables`
    );
  }

  crear(dto: InventarioCrear): Observable<ApiResponse<Inventario>> {
    return this.http.post<ApiResponse<Inventario>>(this.basePath, dto);
  }

  guardarConteo(
    idInventario: number,
    idSubAreaAlmacen: number,
    dto: InventarioConteoGuardar
  ): Observable<ApiResponse<Inventario>> {
    return this.http.put<ApiResponse<Inventario>>(
      `${this.basePath}/${idInventario}/subareas/${idSubAreaAlmacen}/conteo`,
      dto
    );
  }

  cerrar(idInventario: number): Observable<ApiResponse<Inventario>> {
    return this.http.post<ApiResponse<Inventario>>(
      `${this.basePath}/${idInventario}/cerrar`,
      {}
    );
  }

  anular(idInventario: number): Observable<ApiResponse<Inventario>> {
    return this.http.post<ApiResponse<Inventario>>(
      `${this.basePath}/${idInventario}/anular`,
      {}
    );
  }
}
