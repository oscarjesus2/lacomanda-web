import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  PreferenciasSolicitudes,
  SolicitarAnulacionPedido,
  SolicitarAnulacionProducto,
  SolicitarCambioCamarero,
  SolicitarDescuentoEntrada,
  SolicitarDescuentoPedido,
  SolicitarEntradasGratis,
  SolicitudAutorizacion,
  SolicitudAutorizacionCreada,
  normalizarSolicitudAutorizacion,
} from '../models/solicitud-autorizacion.models';

@Injectable({ providedIn: 'root' })
export class SolicitudAutorizacionService {
  private readonly basePath = `${environment.apiUrl}/SolicitudAutorizacion`;

  constructor(private readonly http: HttpClient) {}

  solicitarAnulacionProducto(request: SolicitarAnulacionProducto): Observable<SolicitudAutorizacionCreada> {
    return this.solicitar('anular-producto', request);
  }

  solicitarAnulacionPedido(request: SolicitarAnulacionPedido): Observable<SolicitudAutorizacionCreada> {
    return this.solicitar('anular-pedido', request);
  }

  solicitarCambioCamarero(request: SolicitarCambioCamarero): Observable<SolicitudAutorizacionCreada> {
    return this.solicitar('cambiar-camarero', request);
  }

  solicitarDescuentoPedido(request: SolicitarDescuentoPedido): Observable<SolicitudAutorizacionCreada> {
    return this.solicitar('descuento-pedido', request);
  }

  solicitarDescuentoEntrada(request: SolicitarDescuentoEntrada): Observable<SolicitudAutorizacionCreada> {
    return this.solicitar('descuento-entrada', request);
  }

  solicitarEntradasGratis(request: SolicitarEntradasGratis): Observable<SolicitudAutorizacionCreada> {
    return this.solicitar('entradas-gratis', request);
  }

  /** Autorizaciones de un uso propias: pendientes y aprobadas sin usar. */
  listarMisAutorizaciones(): Observable<SolicitudAutorizacion[]> {
    return this.http
      .get<ApiResponse<SolicitudAutorizacion[]>>(`${this.basePath}/mis-autorizaciones`)
      .pipe(map(response => (response.Data ?? []).map(normalizarSolicitudAutorizacion)));
  }

  obtenerPreferencias(): Observable<PreferenciasSolicitudes> {
    return this.http
      .get<ApiResponse<PreferenciasSolicitudes>>(`${this.basePath}/preferencias`)
      .pipe(map(response => normalizarPreferencias(response.Data)));
  }

  guardarPreferencias(recibirPorCorreo: boolean): Observable<PreferenciasSolicitudes> {
    return this.http
      .put<ApiResponse<PreferenciasSolicitudes>>(`${this.basePath}/preferencias`, { RecibirPorCorreo: recibirPorCorreo })
      .pipe(map(response => normalizarPreferencias(response.Data)));
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

  private solicitar(ruta: string, request: unknown): Observable<SolicitudAutorizacionCreada> {
    return this.http
      .post<ApiResponse<SolicitudAutorizacionCreada>>(`${this.basePath}/${ruta}`, request)
      .pipe(map(response => ({
        Solicitud: normalizarSolicitudAutorizacion(response.Data?.Solicitud),
        AprobadoresConectados: Number(response.Data?.AprobadoresConectados ?? 0),
      })));
  }
}

/** El backend responde en PascalCase; el interceptor no toca estos campos. */
function normalizarPreferencias(raw: any): PreferenciasSolicitudes {
  const valor = (pascal: string) => raw?.[pascal] ?? raw?.[pascal.charAt(0).toLowerCase() + pascal.slice(1)];
  return {
    RecibirPorCorreo: valor('RecibirPorCorreo') === true,
    Email: valor('Email') ?? null,
    EsAprobador: valor('EsAprobador') === true,
    PuedeAprobarDescuentos: valor('PuedeAprobarDescuentos') === true,
  };
}
