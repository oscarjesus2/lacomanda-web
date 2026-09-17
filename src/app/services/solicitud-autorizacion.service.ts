import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  SolicitarAnulacionProducto,
  SolicitudAutorizacion,
  SolicitudAutorizacionCreada,
  normalizarSolicitudAutorizacion,
} from '../models/solicitud-autorizacion.models';

@Injectable({ providedIn: 'root' })
export class SolicitudAutorizacionService {
  private readonly basePath = `${environment.apiUrl}/SolicitudAutorizacion`;

  constructor(private readonly http: HttpClient) {}

  solicitarAnulacionProducto(request: SolicitarAnulacionProducto): Observable<SolicitudAutorizacionCreada> {
    return this.http
      .post<ApiResponse<SolicitudAutorizacionCreada>>(`${this.basePath}/anular-producto`, request)
      .pipe(map(response => ({
        Solicitud: normalizarSolicitudAutorizacion(response.Data?.Solicitud),
        AprobadoresConectados: Number(response.Data?.AprobadoresConectados ?? 0),
      })));
  }

  listarPendientes(): Observable<SolicitudAutorizacion[]> {
    return this.http
      .get<ApiResponse<SolicitudAutorizacion[]>>(`${this.basePath}/pendientes`)
      .pipe(map(response => (response.Data ?? []).map(normalizarSolicitudAutorizacion)));
  }

  listarPorPedido(idPedido: number, nroCuenta: number): Observable<SolicitudAutorizacion[]> {
    return this.http
      .get<ApiResponse<SolicitudAutorizacion[]>>(`${this.basePath}/pedido/${idPedido}/${nroCuenta}`)
      .pipe(map(response => (response.Data ?? []).map(normalizarSolicitudAutorizacion)));
  }

  aprobar(idSolicitud: number): Observable<SolicitudAutorizacion> {
    return this.http
      .put<ApiResponse<SolicitudAutorizacion>>(`${this.basePath}/${idSolicitud}/aprobar`, {})
      .pipe(map(response => normalizarSolicitudAutorizacion(response.Data)));
  }

  denegar(idSolicitud: number, observacion: string | null): Observable<SolicitudAutorizacion> {
    return this.http
      .put<ApiResponse<SolicitudAutorizacion>>(`${this.basePath}/${idSolicitud}/denegar`, { Observacion: observacion })
      .pipe(map(response => normalizarSolicitudAutorizacion(response.Data)));
  }

  cancelar(idSolicitud: number): Observable<SolicitudAutorizacion> {
    return this.http
      .put<ApiResponse<SolicitudAutorizacion>>(`${this.basePath}/${idSolicitud}/cancelar`, {})
      .pipe(map(response => normalizarSolicitudAutorizacion(response.Data)));
  }
}
