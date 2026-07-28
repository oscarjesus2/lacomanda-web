import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ComisionAnfitrionaReporte,
  SeguimientoComandaFiltro,
  SeguimientoComandaReporte,
} from '../interfaces/seguimiento-comanda.interface';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SeguimientoComandaService {
  private readonly basePath = `${environment.apiUrl}/reportes/seguimiento`;

  constructor(private readonly http: HttpClient) {}

  obtenerSeguimiento(
    filtro: SeguimientoComandaFiltro,
  ): Observable<ApiResponse<SeguimientoComandaReporte>> {
    return this.http.get<ApiResponse<SeguimientoComandaReporte>>(
      `${this.basePath}/comandas`,
      { params: this.crearParametros(filtro) },
    );
  }

  obtenerComisionAnfitriona(
    filtro: SeguimientoComandaFiltro,
  ): Observable<ApiResponse<ComisionAnfitrionaReporte>> {
    return this.http.get<ApiResponse<ComisionAnfitrionaReporte>>(
      `${this.basePath}/comision-anfitriona`,
      { params: this.crearParametros(filtro) },
    );
  }

  private crearParametros(filtro: SeguimientoComandaFiltro): HttpParams {
    let params = new HttpParams();

    if (filtro.IdTurno) {
      return params.set('IdTurno', filtro.IdTurno);
    }

    if (filtro.Desde) {
      params = params.set('Desde', filtro.Desde);
    }
    if (filtro.Hasta) {
      params = params.set('Hasta', filtro.Hasta);
    }

    return params;
  }
}
