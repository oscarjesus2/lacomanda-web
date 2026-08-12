import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Estacion,
  EstacionDescargaStock,
} from '../models/estacion.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({ providedIn: 'root' })
export class EstacionService {
  private basePath = environment.apiUrl + '/estacion';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Estacion[]>> {
    return this.http.get<ApiResponse<Estacion[]>>(this.basePath );
  }

  create(e: Estacion): Observable<ApiResponse<Estacion>> {
    return this.http.post<ApiResponse<Estacion>>(this.basePath, e);
  }

  update(e: Estacion): Observable<ApiResponse<Estacion>> {
    return this.http.put<ApiResponse<Estacion>>(this.basePath + '/' + e.IdEstacion, e);
  }

  getStockDischarges(
    idEstacion: number,
  ): Observable<ApiResponse<EstacionDescargaStock[]>> {
    return this.http.get<ApiResponse<EstacionDescargaStock[]>>(
      `${this.basePath}/${idEstacion}/descargas-stock`,
    );
  }

  updateStockDischarges(
    idEstacion: number,
    idsSubAreasAlmacen: number[],
  ): Observable<ApiResponse<EstacionDescargaStock[]>> {
    return this.http.put<ApiResponse<EstacionDescargaStock[]>>(
      `${this.basePath}/${idEstacion}/descargas-stock`,
      { IdsSubAreasAlmacen: idsSubAreasAlmacen },
    );
  }

  linkDevice(id: number, identificadorUnico: string): Observable<ApiResponse<Estacion>> {
    return this.http.put<ApiResponse<Estacion>>(
      `${this.basePath}/${id}/dispositivo`,
      { IdentificadorUnico: identificadorUnico },
    );
  }

  verifyDeviceLink(identificadorUnico: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(
      `${this.basePath}/dispositivo/vinculacion`,
      { params: { identificadorUnico } },
    );
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(this.basePath + '/' + id);
  }
}
