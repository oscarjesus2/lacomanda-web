import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ActualizarBancoDestino,
  BancoDestino,
  CrearBancoDestino,
} from '../models/banco-destino.models';

@Injectable({ providedIn: 'root' })
export class BancoDestinoService {
  private readonly basePath = `${environment.apiUrl}/bancos-destino`;
  private readonly cambiosBanco = new Subject<void>();

  readonly cambios$ = this.cambiosBanco.asObservable();

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ApiResponse<BancoDestino[]>> {
    return this.http.get<ApiResponse<BancoDestino[]>>(this.basePath);
  }

  crear(solicitud: CrearBancoDestino): Observable<ApiResponse<BancoDestino>> {
    return this.http.post<ApiResponse<BancoDestino>>(this.basePath, solicitud);
  }

  listarMaestro(): Observable<ApiResponse<BancoDestino[]>> {
    return this.http.get<ApiResponse<BancoDestino[]>>(`${this.basePath}/maestro`);
  }

  actualizar(
    idBanco: number,
    solicitud: ActualizarBancoDestino,
  ): Observable<ApiResponse<BancoDestino>> {
    return this.http.put<ApiResponse<BancoDestino>>(
      `${this.basePath}/${idBanco}`,
      solicitud,
    );
  }

  notificarCambios(): void {
    this.cambiosBanco.next();
  }
}
