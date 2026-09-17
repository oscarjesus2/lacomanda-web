
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ImpresionDTO } from '../interfaces/impresionDTO.interface';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class EntradasEmitidasService {
    private basePath = environment.apiUrl + '/EntradasEmitidas/';

  constructor(private http: HttpClient) {}

  // El usuario logeado ya no se envía: el backend lo obtiene del token autenticado.
  procesarEmisionEntradas(cantidadEntradas: number, tipoEntrada: string, idVentaRef?: number): Observable<ApiResponse<ImpresionDTO[]>> {
    return this.http.put<ApiResponse<ImpresionDTO[]>>(`${this.basePath }ProcesarEmisionEntradas/${cantidadEntradas}/${tipoEntrada}/${idVentaRef}`, {});
  }

  /**
   * Entradas sin cobro. Quien puede aplicar descuentos las emite directamente;
   * el resto manda la autorización aprobada, que el backend consume.
   */
  emitirEntradasGratis(
    socios: number,
    invitados: number,
    idSolicitudAutorizacion?: number,
  ): Observable<ApiResponse<ImpresionDTO[]>> {
    return this.http.post<ApiResponse<ImpresionDTO[]>>(`${this.basePath}gratis`, {
      Socios: socios,
      Invitados: invitados,
      IdSolicitudAutorizacion: idSolicitudAutorizacion ?? null,
    });
  }
}
