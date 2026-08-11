import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { ConsultaStockAlmacen } from '../models/stock-almacen.models';

@Injectable({ providedIn: 'root' })
export class StockAlmacenService {
  private readonly basePath = `${environment.apiUrl}/stock-almacen`;

  constructor(private readonly http: HttpClient) {}

  consultar(
    idAreaAlmacen?: number | null,
    idSubAreaAlmacen?: number | null
  ): Observable<ApiResponse<ConsultaStockAlmacen>> {
    let params = new HttpParams();
    if (idAreaAlmacen !== null && idAreaAlmacen !== undefined) {
      params = params.set('idAreaAlmacen', idAreaAlmacen.toString());
    }
    if (idSubAreaAlmacen !== null && idSubAreaAlmacen !== undefined) {
      params = params.set('idSubAreaAlmacen', idSubAreaAlmacen.toString());
    }

    return this.http.get<ApiResponse<ConsultaStockAlmacen>>(this.basePath, { params });
  }
}
