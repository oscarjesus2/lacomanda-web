import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  CambiarEstadoPreparacionPedido,
  EstacionPreparacion,
  LineaPreparacionCocina,
  OcultarLineaPreparacion,
} from '../models/preparacion-cocina.models';

@Injectable({ providedIn: 'root' })
export class CocinaService {
  private readonly basePath = `${environment.apiUrl}/preparacion`;

  constructor(private readonly http: HttpClient) {}

  obtenerEstacion(): Observable<ApiResponse<EstacionPreparacion>> {
    return this.http.get<ApiResponse<EstacionPreparacion>>(`${this.basePath}/estacion`);
  }

  listarLineas(): Observable<ApiResponse<LineaPreparacionCocina[]>> {
    return this.http.get<ApiResponse<LineaPreparacionCocina[]>>(
      `${this.basePath}/lineas`,
    );
  }

  ocultarLinea(request: OcultarLineaPreparacion): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.basePath}/lineas/ocultar`, request);
  }

  listarHistorial(desdeUtc: string, hastaUtc: string): Observable<ApiResponse<LineaPreparacionCocina[]>> {
    const params = new HttpParams().set('DesdeUtc', desdeUtc).set('HastaUtc', hastaUtc);
    return this.http.get<ApiResponse<LineaPreparacionCocina[]>>(`${this.basePath}/historial`, { params });
  }

  cambiarEstado(
    request: CambiarEstadoPreparacionPedido,
  ): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.basePath}/lineas/estado`,
      request,
    );
  }
}
