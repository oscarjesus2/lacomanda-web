import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  CartaMesaCliente,
  ConfirmarSolicitudMesa,
  EstadoAccesoMesa,
  PedidoMesaClienteResultado,
  RegistrarPedidoMesaCliente,
  SolicitudAccesoMesa,
  SolicitudMesaPendiente
} from '../models/mesa-cliente.models';

@Injectable({ providedIn: 'root' })
export class MesaClienteService {
  private readonly basePath = `${environment.apiUrl}/mesa-cliente`;

  constructor(private readonly http: HttpClient) {}

  solicitar(codigoQr: string): Observable<ApiResponse<SolicitudAccesoMesa>> {
    return this.http.post<ApiResponse<SolicitudAccesoMesa>>(
      `${this.basePath}/solicitudes/${encodeURIComponent(codigoQr)}`,
      {},
      { headers: this.tenantHeaders() }
    );
  }

  consultar(token: string): Observable<ApiResponse<EstadoAccesoMesa>> {
    return this.http.get<ApiResponse<EstadoAccesoMesa>>(
      `${this.basePath}/sesion`,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  consultarCarta(token: string): Observable<ApiResponse<CartaMesaCliente>> {
    return this.http.get<ApiResponse<CartaMesaCliente>>(
      `${this.basePath}/carta`,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  registrarPedido(
    token: string,
    request: RegistrarPedidoMesaCliente
  ): Observable<ApiResponse<PedidoMesaClienteResultado>> {
    return this.http.post<ApiResponse<PedidoMesaClienteResultado>>(
      `${this.basePath}/pedidos`,
      request,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  listarPendientes(): Observable<ApiResponse<SolicitudMesaPendiente[]>> {
    return this.http.get<ApiResponse<SolicitudMesaPendiente[]>>(
      `${this.basePath}/solicitudes-pendientes`
    );
  }

  confirmar(
    idSesion: number,
    request: ConfirmarSolicitudMesa
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.basePath}/solicitudes/${idSesion}/confirmar`,
      request
    );
  }

  rechazar(idSesion: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.basePath}/solicitudes/${idSesion}/rechazar`,
      {}
    );
  }

  private tenantHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-Host': window.location.hostname });
  }
}
