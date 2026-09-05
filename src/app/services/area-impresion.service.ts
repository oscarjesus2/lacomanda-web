import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ActualizarValidacionesAreaImpresionDispositivo,
  AreaImpresion,
  EstadoPruebaImpresionArea,
  PruebaImpresionAreaEncolada,
  ValidacionAreaImpresionDispositivo,
} from '../models/area-impresion.models';

@Injectable({ providedIn: 'root' })
export class AreaImpresionService {
  private base = `${environment.apiUrl}/areaimpresion`;
  constructor(private http: HttpClient) {}
 

  listar(): Observable<AreaImpresion[]> {
    return this.http.get<ApiResponse<AreaImpresion[]>>(`${this.base}`)
      .pipe(map(r => r.Data ?? []));
  }

  crear(area: AreaImpresion): Observable<ApiResponse<AreaImpresion>> {
    return this.http.post<ApiResponse<AreaImpresion>>(`${this.base}`, area);
  }

  actualizar(area: AreaImpresion): Observable<ApiResponse<AreaImpresion>> {
    return this.http.put<ApiResponse<AreaImpresion>>(`${this.base}/${area.IdAreaImpresion}`, area);
  }

  eliminar(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.base}/${id}`);
  }

  obtenerValidacionesDispositivo(
    identificadorDispositivo: string,
  ): Observable<ValidacionAreaImpresionDispositivo[]> {
    const identificador = encodeURIComponent(identificadorDispositivo);
    return this.http.get<ApiResponse<ValidacionAreaImpresionDispositivo[]>>(
      `${this.base}/dispositivos/${identificador}/validaciones`,
    ).pipe(map(r => r.Data ?? []));
  }

  guardarValidacionesDispositivo(
    identificadorDispositivo: string,
    validaciones: ActualizarValidacionesAreaImpresionDispositivo,
  ): Observable<ApiResponse<ValidacionAreaImpresionDispositivo[]>> {
    const identificador = encodeURIComponent(identificadorDispositivo);
    return this.http.put<ApiResponse<ValidacionAreaImpresionDispositivo[]>>(
      `${this.base}/dispositivos/${identificador}/validaciones`,
      validaciones,
    );
  }

  solicitarPruebaAgente(
    idAreaImpresion: number,
    identificadorDispositivo: string,
  ): Observable<ApiResponse<PruebaImpresionAreaEncolada>> {
    return this.http.post<ApiResponse<PruebaImpresionAreaEncolada>>(
      `${this.base}/${idAreaImpresion}/prueba-agente`,
      { IdentificadorDispositivo: identificadorDispositivo },
    );
  }

  consultarEstadoPrueba(
    idTrabajoImpresion: number,
  ): Observable<ApiResponse<EstadoPruebaImpresionArea>> {
    return this.http.get<ApiResponse<EstadoPruebaImpresionArea>>(
      `${this.base}/pruebas/${idTrabajoImpresion}`,
    );
  }
}
