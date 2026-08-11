import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ConsultaKardexAlmacen,
  KardexAlmacenCatalogos
} from 'src/app/models/kardex-almacen.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class KardexAlmacenService {
  private readonly basePath = `${environment.apiUrl}/kardex-almacen`;

  constructor(private readonly http: HttpClient) {}

  obtenerCatalogos(): Observable<ApiResponse<KardexAlmacenCatalogos>> {
    return this.http.get<ApiResponse<KardexAlmacenCatalogos>>(`${this.basePath}/catalogos`);
  }

  consultar(
    idSubAreaAlmacen: number,
    idArticulo: number,
    fechaDesde: string,
    fechaHasta: string
  ): Observable<ApiResponse<ConsultaKardexAlmacen>> {
    const params = new HttpParams()
      .set('idSubAreaAlmacen', idSubAreaAlmacen.toString())
      .set('idArticulo', idArticulo.toString())
      .set('fechaDesde', fechaDesde)
      .set('fechaHasta', fechaHasta);

    return this.http.get<ApiResponse<ConsultaKardexAlmacen>>(this.basePath, { params });
  }
}
