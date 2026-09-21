import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ComprobantesFiscalesPendientes,
  normalizarComprobantesFiscalesPendientes,
} from 'src/app/models/comprobante-fiscal-pendiente.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ComprobantesFiscalesPendientesService {
  private readonly path =
    `${environment.apiUrl}/notificaciones/comprobantes-fiscales-pendientes`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ComprobantesFiscalesPendientes> {
    return this.http
      .get<ApiResponse<ComprobantesFiscalesPendientes>>(this.path)
      .pipe(map(response =>
        normalizarComprobantesFiscalesPendientes(response.Data)));
  }
}
