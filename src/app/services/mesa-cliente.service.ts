import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  CartaPublicaMesaCliente,
  CartaMesaCliente,
  CheckoutCuentaMesa,
  CrearCheckoutPedidoMesaCliente,
  ConsultarAsistenteCartaMesaCliente,
  ConfirmarSolicitudMesa,
  EstadoAccesoMesa,
  EstadoPagoCuentaMesa,
  PedidoMesaClienteResultado,
  ResumenPagosCuentaOnline,
  RegistrarPedidoMesaCliente,
  RespuestaAsistenteCartaMesaCliente,
  SolicitudAccesoMesa,
  SolicitudMesaPendiente
} from '../models/mesa-cliente.models';

@Injectable({ providedIn: 'root' })
export class MesaClienteService {
  private readonly basePath = `${environment.apiUrl}/mesa-cliente`;
  private readonly publicRequestHeader = 'X-LaComanda-Public-Request';

  constructor(private readonly http: HttpClient) {}

  consultarCartaPublica(codigoQr: string): Observable<ApiResponse<CartaPublicaMesaCliente>> {
    return this.http.get<ApiResponse<CartaPublicaMesaCliente>>(
      `${this.basePath}/carta-publica/${encodeURIComponent(codigoQr)}`,
      { headers: this.tenantHeaders() }
    );
  }

  consultarAsistente(
    codigoQr: string,
    request: ConsultarAsistenteCartaMesaCliente
  ): Observable<ApiResponse<RespuestaAsistenteCartaMesaCliente>> {
    return this.http.post<ApiResponse<RespuestaAsistenteCartaMesaCliente>>(
      `${this.basePath}/carta-publica/${encodeURIComponent(codigoQr)}/asistente`,
      request,
      { headers: this.tenantHeaders() }
    );
  }

  obtenerImagenProducto(codigoQr: string, idProducto: number): Observable<Blob> {
    return this.http.get(
      `${this.basePath}/carta-publica/${encodeURIComponent(codigoQr)}/productos/${idProducto}/imagen`,
      { headers: this.tenantHeaders(), responseType: 'blob' }
    );
  }

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

  registrarPedidoPagado(
    token: string,
    idIntento: string,
    request: RegistrarPedidoMesaCliente
  ): Observable<ApiResponse<PedidoMesaClienteResultado>> {
    return this.http.post<ApiResponse<PedidoMesaClienteResultado>>(
      `${this.basePath}/pedidos/pagados/${encodeURIComponent(idIntento)}`,
      request,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  crearCheckout(
    token: string,
    returnUrl: string,
    importe?: number,
  ): Observable<ApiResponse<CheckoutCuentaMesa>> {
    return this.http.post<ApiResponse<CheckoutCuentaMesa>>(
      `${this.basePath}/pagos/checkout`,
      { ReturnUrl: returnUrl, Importe: importe },
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  crearCheckoutPedido(
    token: string,
    request: CrearCheckoutPedidoMesaCliente,
  ): Observable<ApiResponse<CheckoutCuentaMesa>> {
    return this.http.post<ApiResponse<CheckoutCuentaMesa>>(
      `${this.basePath}/pedidos/checkout`,
      request,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  consultarPago(
    token: string,
    idIntento: string
  ): Observable<ApiResponse<EstadoPagoCuentaMesa>> {
    return this.http.get<ApiResponse<EstadoPagoCuentaMesa>>(
      `${this.basePath}/pagos/${encodeURIComponent(idIntento)}`,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  cancelarPago(
    token: string,
    idIntento: string
  ): Observable<ApiResponse<EstadoPagoCuentaMesa>> {
    return this.http.delete<ApiResponse<EstadoPagoCuentaMesa>>(
      `${this.basePath}/pagos/${encodeURIComponent(idIntento)}`,
      { headers: this.tenantHeaders().set('X-Mesa-Token', token) }
    );
  }

  cancelarPagoAlAbandonar(token: string, idIntento: string): void {
    const url = `${this.basePath}/pagos/${encodeURIComponent(idIntento)}`
      + `/abandonar?tenantHost=${encodeURIComponent(window.location.hostname)}`;
    // text/plain evita un preflight CORS durante pagehide; el token nunca se
    // coloca en la URL y el endpoint lo consume como cuerpo crudo.
    const blob = new Blob([token], { type: 'text/plain;charset=UTF-8' });
    if (navigator.sendBeacon?.(url, blob)) return;

    void fetch(url, {
      method: 'POST',
      body: token,
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  }

  consultarPagosCuenta(
    idPedido: number,
    nroCuenta: number,
  ): Observable<ApiResponse<ResumenPagosCuentaOnline>> {
    return this.http.get<ApiResponse<ResumenPagosCuentaOnline>>(
      `${this.basePath}/pedidos/${idPedido}/cuentas/${nroCuenta}/pagos`,
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
    return new HttpHeaders({
      'X-Tenant-Host': window.location.hostname,
      [this.publicRequestHeader]: 'true'
    });
  }
}
