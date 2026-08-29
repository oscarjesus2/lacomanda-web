import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import {
  ConsultaControlHorario,
  CorregirRegistroJornadaRequest,
  EstadoControlHorario,
  RegistroJornada,
} from '../models/control-horario.models';

@Injectable({ providedIn: 'root' })
export class ControlHorarioService {
  private readonly baseUrl = `${environment.apiUrl}/control-horario`;

  constructor(private readonly http: HttpClient) {}

  obtenerMiJornada(): Observable<ApiResponse<EstadoControlHorario>> {
    return this.http.get<ApiResponse<EstadoControlHorario>>(
      `${this.baseUrl}/mi-jornada`);
  }

  iniciarJornada(): Observable<ApiResponse<RegistroJornada>> {
    return this.http.post<ApiResponse<RegistroJornada>>(
      `${this.baseUrl}/mi-jornada/iniciar`, {});
  }

  iniciarPausa(): Observable<ApiResponse<RegistroJornada>> {
    return this.http.post<ApiResponse<RegistroJornada>>(
      `${this.baseUrl}/mi-jornada/pausas/iniciar`, {});
  }

  reanudarJornada(): Observable<ApiResponse<RegistroJornada>> {
    return this.http.post<ApiResponse<RegistroJornada>>(
      `${this.baseUrl}/mi-jornada/pausas/finalizar`, {});
  }

  finalizarJornada(): Observable<ApiResponse<RegistroJornada>> {
    return this.http.post<ApiResponse<RegistroJornada>>(
      `${this.baseUrl}/mi-jornada/finalizar`, {});
  }

  consultar(
    fechaDesde: string,
    fechaHasta: string,
    idEmpleado?: number | null,
  ): Observable<ApiResponse<ConsultaControlHorario>> {
    let params = new HttpParams()
      .set('FechaDesde', fechaDesde)
      .set('FechaHasta', fechaHasta);
    if (idEmpleado) {
      params = params.set('IdEmpleado', idEmpleado.toString());
    }

    return this.http.get<ApiResponse<ConsultaControlHorario>>(
      `${this.baseUrl}/registros`, { params });
  }

  corregir(
    idRegistroJornada: number,
    request: CorregirRegistroJornadaRequest,
  ): Observable<ApiResponse<RegistroJornada>> {
    return this.http.put<ApiResponse<RegistroJornada>>(
      `${this.baseUrl}/registros/${idRegistroJornada}`,
      request);
  }
}
