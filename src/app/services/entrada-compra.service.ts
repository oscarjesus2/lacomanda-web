import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  EntradaCompra,
  EntradaCompraCatalogos,
  EntradaCompraCanjearGuias,
  ConfirmarFacturaCompraIa,
  CuotaDocumentosCompraIa,
  EntradaCompraCrearNota,
  EntradaCompraGuardar,
  FacturaCompraIaPrevisualizacion,
  PagoProveedorGuardar,
  EntradaCompraResumen
} from '../models/entrada-compra.models';
import { environment } from 'src/environments/environment';
import { FechaFiltro, fechaFiltroParaApi } from '../shared/fechas/fecha-filtro';

@Injectable({ providedIn: 'root' })
export class EntradaCompraService {
  private readonly basePath = `${environment.apiUrl}/compras-almacen`;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: {
    FechaInicio?: FechaFiltro | null;
    FechaFin?: FechaFiltro | null;
    CampoFecha?: string;
    Estado?: number | null;
    Buscar?: string;
  }): Observable<ApiResponse<EntradaCompraResumen[]>> {
    const campoFecha = (filtro.CampoFecha || 'recepcion').trim().toLowerCase();
    let params = new HttpParams()
      .set('CampoFecha', campoFecha);

    if (filtro.FechaInicio) {
      params = params.set(
        'FechaInicio',
        fechaFiltroParaApi(filtro.FechaInicio)
      );
      if (campoFecha !== 'emision') {
        params = params.set('InstanteDesdeUtc', this.inicioDiaLocalUtc(filtro.FechaInicio));
      }
    }
    if (filtro.FechaFin) {
      params = params.set(
        'FechaFin',
        fechaFiltroParaApi(filtro.FechaFin)
      );
      if (campoFecha !== 'emision') {
        params = params.set('InstanteHastaUtcExclusivo', this.inicioDiaLocalUtc(filtro.FechaFin, 1));
      }
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

  previsualizarFactura(
    archivo: File
  ): Observable<ApiResponse<FacturaCompraIaPrevisualizacion>> {
    const formulario = new FormData();
    formulario.append('documento', archivo, archivo.name);
    return this.http.post<ApiResponse<FacturaCompraIaPrevisualizacion>>(
      `${this.basePath}/documentos-ia/previsualizar`,
      formulario
    );
  }

  cuotaDocumentosIa(): Observable<ApiResponse<CuotaDocumentosCompraIa>> {
    return this.http.get<ApiResponse<CuotaDocumentosCompraIa>>(
      `${this.basePath}/documentos-ia/cuota`
    );
  }

  confirmarFactura(
    dto: ConfirmarFacturaCompraIa
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/documentos-ia/confirmar`,
      { ...dto, Entrada: this.normalizarFechaDocumento(dto.Entrada) }
    );
  }

  crear(
    dto: EntradaCompraGuardar
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      this.basePath,
      this.normalizarFechaDocumento(dto)
    );
  }

  actualizar(
    idEntrada: number,
    dto: EntradaCompraGuardar
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.put<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}`,
      this.normalizarFechaDocumento(dto)
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

  registrarPagoProveedor(
    idEntrada: number,
    dto: PagoProveedorGuardar
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/pagos`,
      dto
    );
  }

  eliminarPagoProveedor(
    idEntrada: number,
    idPagoProveedor: number
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.delete<ApiResponse<EntradaCompra>>(
      `${this.basePath}/${idEntrada}/pagos/${idPagoProveedor}`
    );
  }

  reprogramarPagoProveedor(
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
      {
        ...dto,
        FechaEmision: fechaFiltroParaApi(dto.FechaEmision),
        FechaRecepcionLocal: fechaFiltroParaApi(dto.FechaRecepcion)
      }
    );
  }

  crearNota(
    dto: EntradaCompraCrearNota
  ): Observable<ApiResponse<EntradaCompra>> {
    return this.http.post<ApiResponse<EntradaCompra>>(
      `${this.basePath}/notas`,
      { ...dto, Documento: this.normalizarFechaDocumento(dto.Documento) }
    );
  }

  private normalizarFechaDocumento(dto: EntradaCompraGuardar): EntradaCompraGuardar {
    return {
      ...dto,
      FechaEmision: fechaFiltroParaApi(dto.FechaEmision),
      FechaRecepcionLocal: fechaFiltroParaApi(dto.FechaRecepcion)
    };
  }

  private inicioDiaLocalUtc(fecha: FechaFiltro, dias = 0): string {
    const [year, month, day] = fechaFiltroParaApi(fecha).split('-').map(Number);
    return new Date(year, month - 1, day + dias).toISOString();
  }
}
