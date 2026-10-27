import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  TipoDocumentoCompraEstado,
  TipoDocumentoCompraMantenimiento,
} from '../models/tipo-documento-compra.models';

@Injectable({ providedIn: 'root' })
export class TipoDocumentoCompraService {
  private readonly basePath = `${environment.apiUrl}/documentos-compra`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<TipoDocumentoCompraMantenimiento[]>> {
    return this.http.get<ApiResponse<TipoDocumentoCompraMantenimiento[]>>(
      this.basePath,
    );
  }

  cambiarEstado(
    idTipoDocumentoCompra: string,
    dto: TipoDocumentoCompraEstado,
  ): Observable<ApiResponse<TipoDocumentoCompraMantenimiento>> {
    return this.http.put<ApiResponse<TipoDocumentoCompraMantenimiento>>(
      `${this.basePath}/${idTipoDocumentoCompra}/estado`,
      dto,
    );
  }
}
