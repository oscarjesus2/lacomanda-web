import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  DeliveryCliente,
  DeliveryContexto,
  DeliveryHistorial,
  GuardarDeliveryCliente,
  ProductoPrecioSocioNegocio
} from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly basePath = `${environment.apiUrl}/delivery`;

  constructor(private readonly http: HttpClient) {}

  buscarClientes(termino = ''): Observable<ApiResponse<DeliveryCliente[]>> {
    const params = termino.trim()
      ? new HttpParams().set('termino', termino.trim())
      : undefined;

    return this.http.get<ApiResponse<DeliveryCliente[]>>(
      `${this.basePath}/clientes`,
      { params }
    );
  }

  obtenerContexto(): Observable<ApiResponse<DeliveryContexto>> {
    return this.http.get<ApiResponse<DeliveryContexto>>(
      `${this.basePath}/contexto`
    );
  }

  obtenerPreciosSocioNegocio(
    idSocioNegocio: number
  ): Observable<ApiResponse<ProductoPrecioSocioNegocio[]>> {
    return this.http.get<ApiResponse<ProductoPrecioSocioNegocio[]>>(
      `${this.basePath}/socios-negocio/${idSocioNegocio}/precios`
    );
  }

  obtenerHistorial(
    idCliente: number,
    cantidad = 10
  ): Observable<ApiResponse<DeliveryHistorial[]>> {
    const params = new HttpParams().set('cantidad', cantidad);
    return this.http.get<ApiResponse<DeliveryHistorial[]>>(
      `${this.basePath}/clientes/${idCliente}/historial`,
      { params }
    );
  }

  guardarCliente(
    dto: GuardarDeliveryCliente
  ): Observable<ApiResponse<DeliveryCliente>> {
    return this.http.post<ApiResponse<DeliveryCliente>>(
      `${this.basePath}/clientes`,
      dto
    );
  }
}
