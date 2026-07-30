import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  EntradaCompra,
  EntradaCompraCatalogos,
  EntradaCompraCanjearGuias,
  EntradaCompraCrearNota,
  EntradaCompraGuardar,
  EntradaCompraPagoGuardar,
  EntradaCompraResumen
} from '../models/entrada-compra.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class EntradaCompraService {
  private readonly basePath = `${environment.apiUrl}/compras-almacen`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: {
    FechaInicio?: Date | string | null;
    FechaFin?: Date | string | null;
    CampoFecha?: string;
    Estado?: number | null;
    Buscar?: string;
  }): Observable<ApiResponse<EntradaCompraResumen[]>> {
    let params = new HttpParams()
      .set('CampoFecha', filtro.CampoFecha || 'recepcion');

    if (filtro.FechaInicio) {
      params = params.set(
        'FechaInicio',
        this.fechaParaApi(filtro.FechaInicio)
      );
    }
    if (filtro.FechaFin) {
      params = params.set(
        'FechaFin',
        this.fechaParaApi(filtro.FechaFin)
      );
    }
    if (filtro.Estado) {
      params = params.set('Estado', filtro.Estado);
    }
    if (filtro.Buscar?.trim()) {
      params = params.set('Buscar', filtro.Buscar.trim());
    }

    return this.http.get<ApiResponse<EntradaCompraResumen[]>>(
      this.basePath,
      { params }
    );
  }

  obtener(idEntrada: number): Observable<ApiResponse<EntradaCompra>> {
    return this.http.get<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}`
    );
  }

  catalogos(): Observable<ApiResponse<EntradaCompraCatalogos>> {
    return this.http.get<ApiResponse<EntradaCompraCatalogos>>(
      `${this.basePath}/catalogos`
    );
  }

  crear(
    dto: EntradaCompraGuardar
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      this.basePath,
      dto
    );
  }

  actualizar(
    idEntrada: number,
    dto: EntradaCompraGuardar
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.put<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}`,
      dto
    );
  }

  revisar(idEntrada: number): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/revisar`,
      {}
    );
  }

  anular(idEntrada: number): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/anular`,
      {}
    );
  }

  registrarPago(
    idEntrada: number,
    dto: EntradaCompraPagoGuardar
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/pagos`,
      dto
    );
  }

  eliminarPago(
    idEntrada: number,
    idPagoEntrada: number
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.delete<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/pagos/${idPagoEntrada}`
    );
  }

  reprogramarPago(
    idEntrada: number,
    fechaPagoProgramada: Date | string
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.put<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/fecha-pago`,
      { FechaPagoProgramada: fechaPagoProgramada }
    );
  }

  canjearGuias(
    dto: EntradaCompraCanjearGuias
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/canjes`,
      dto
    );
  }

  crearNota(
    dto: EntradaCompraCrearNota
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/notas`,
      dto
    );
  }

  private fechaParaApi(value: Date | string): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  }
}
