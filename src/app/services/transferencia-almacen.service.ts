import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  TransferenciaAlmacen,
  TransferenciaAlmacenCatalogos,
  TransferenciaAlmacenGuardar,
  TransferenciaAlmacenResumen
} from '../models/transferencia-almacen.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class TransferenciaAlmacenService {
  private readonly basePath = `${environment.apiUrl}/transferencias-almacen`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: {
    FechaInicio?: Date | string | null;
    FechaFin?: Date | string | null;
    IdSubAreaAlmacenOrigen?: number | null;
    IdSubAreaAlmacenDestino?: number | null;
    Estado?: number | null;
    Buscar?: string;
  }): Observable<ApiResponse<TransferenciaAlmacenResumen[]>> {
    let params = new HttpParams();
    if (filtro.FechaInicio) {
      params = params.set('FechaInicio', this.fechaParaApi(filtro.FechaInicio));
    }
    if (filtro.FechaFin) {
      params = params.set('FechaFin', this.fechaParaApi(filtro.FechaFin));
    }
    if (filtro.IdSubAreaAlmacenOrigen) {
      params = params.set('IdSubAreaAlmacenOrigen', filtro.IdSubAreaAlmacenOrigen);
    }
    if (filtro.IdSubAreaAlmacenDestino) {
      params = params.set('IdSubAreaAlmacenDestino', filtro.IdSubAreaAlmacenDestino);
    }
    if (filtro.Estado) {
      params = params.set('Estado', filtro.Estado);
    }
    if (filtro.Buscar?.trim()) {
      params = params.set('Buscar', filtro.Buscar.trim());
    }

    return this.http.get<ApiResponse<TransferenciaAlmacenResumen[]>>(
      this.basePath,
      { params }
    );
  }

  obtener(id: number): Observable<ApiResponse<TransferenciaAlmacen>> {
    return this.http.get<ApiResponse<TransferenciaAlmacen>>(`${this.basePath}/${id}`);
  }

  catalogos(): Observable<ApiResponse<TransferenciaAlmacenCatalogos>> {
    return this.http.get<ApiResponse<TransferenciaAlmacenCatalogos>>(
      `${this.basePath}/catalogos`
    );
  }

  crear(dto: TransferenciaAlmacenGuardar): Observable<ApiResponse<TransferenciaAlmacen>> {
    return this.http.post<ApiResponse<TransferenciaAlmacen>>(this.basePath, dto);
  }

  anular(id: number): Observable<ApiResponse<TransferenciaAlmacen>> {
    return this.http.post<ApiResponse<TransferenciaAlmacen>>(
      `${this.basePath}/${id}/anular`,
      {}
    );
  }

  private fechaParaApi(value: Date | string): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  }
}
