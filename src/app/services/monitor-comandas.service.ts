import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  MonitorComandaDetalle,
  MonitorPedidoResumen,
  MonitorTurno
} from 'src/app/models/monitor-comandas.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MonitorComandasService {
  private readonly basePath = `${environment.apiUrl}/monitor-comandas`;

  constructor(private readonly http: HttpClient) {}

  listarTurnos(
    fechaDesde: string,
    fechaHasta: string,
    busqueda = ''
  ): Observable<ApiResponse<MonitorTurno[]>> {
    let params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    if (busqueda.trim()) params = params.set('Busqueda', busqueda.trim());

    return this.http.get<ApiResponse<MonitorTurno[]>>(
      `${this.basePath}/turnos`,
      { params }
    );
  }

  listarPedidos(
    idTurno: number,
    busqueda = ''
  ): Observable<ApiResponse<MonitorPedidoResumen[]>> {
    let params = new HttpParams();
    if (busqueda.trim()) params = params.set('Busqueda', busqueda.trim());

    return this.http.get<ApiResponse<MonitorPedidoResumen[]>>(
      `${this.basePath}/turnos/${idTurno}/pedidos`,
      { params }
    );
  }

  obtenerDetalle(
    idPedido: number
  ): Observable<ApiResponse<MonitorComandaDetalle>> {
    return this.http.get<ApiResponse<MonitorComandaDetalle>>(
      `${this.basePath}/pedidos/${idPedido}`
    );
  }
}
