
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

  procesarEmisionEntradas(cantidadEntradas: number, tipoEntrada: string,usuarioLogeado: number, idVentaRef?: number): Observable<ApiResponse<ImpresionDTO[]>> {
    return this.http.put<ApiResponse<ImpresionDTO[]>>(`${this.basePath }ProcesarEmisionEntradas/${cantidadEntradas}/${tipoEntrada}/${usuarioLogeado}/${idVentaRef}`, {});
  }
}
