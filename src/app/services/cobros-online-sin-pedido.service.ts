import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  CobroOnlineSinPedido,
  VincularCobroOnlineAPedido,
} from '../models/cobros-online-sin-pedido.models';

@Injectable({ providedIn: 'root' })
export class CobrosOnlineSinPedidoService {
  private readonly basePath = `${environment.apiUrl}/cobros-online-sin-pedido`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<CobroOnlineSinPedido[]>> {
    return this.http.get<ApiResponse<CobroOnlineSinPedido[]>>(this.basePath);
  }

  vincularComoPagoCuenta(
    idIntento: string,
    request: VincularCobroOnlineAPedido,
  ): Observable<ApiResponse<CobroOnlineSinPedido>> {
    return this.http.post<ApiResponse<CobroOnlineSinPedido>>(
      `${this.basePath}/${encodeURIComponent(idIntento)}/vincular-pago-cuenta`,
      request,
    );
  }

  solicitarDevolucion(idIntento: string): Observable<ApiResponse<CobroOnlineSinPedido>> {
    return this.http.post<ApiResponse<CobroOnlineSinPedido>>(
      `${this.basePath}/${encodeURIComponent(idIntento)}/solicitar-devolucion`,
      {},
    );
  }
}
