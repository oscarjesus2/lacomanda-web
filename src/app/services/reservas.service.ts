import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ConfiguracionReservas,
  CrearReservaPublicaRequest,
  DisponibilidadReserva,
  EspacioReserva,
  Reserva,
  ReservaCreada
} from 'src/app/models/reservas.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly basePath = `${environment.apiUrl}/reservas`;
  private readonly publicPath = `${environment.apiUrl}/public/reservas`;

  constructor(private readonly http: HttpClient) {}

  obtenerConfiguracion(): Observable<ApiResponse<ConfiguracionReservas>> {
    return this.http.get<ApiResponse<ConfiguracionReservas>>(`${this.basePath}/configuracion`);
  }

  guardarConfiguracion(value: ConfiguracionReservas): Observable<ApiResponse<ConfiguracionReservas>> {
    return this.http.put<ApiResponse<ConfiguracionReservas>>(`${this.basePath}/configuracion`, value);
  }

  listarEspacios(): Observable<ApiResponse<EspacioReserva[]>> {
    return this.http.get<ApiResponse<EspacioReserva[]>>(`${this.basePath}/espacios`);
  }

  guardarEspacios(espacios: EspacioReserva[]): Observable<ApiResponse<EspacioReserva[]>> {
    return this.http.put<ApiResponse<EspacioReserva[]>>(`${this.basePath}/espacios`, {
      Espacios: espacios.map(x => ({ IdEspacio: x.IdEspacio, AceptaReservas: x.AceptaReservas, CapacidadReserva: x.CapacidadReserva }))
    });
  }

  listar(fechaDesde: string, fechaHasta: string, estado?: string): Observable<ApiResponse<Reserva[]>> {
    let params = new HttpParams().set('FechaDesde', fechaDesde).set('FechaHasta', fechaHasta);
    if (estado) params = params.set('Estado', estado);
    return this.http.get<ApiResponse<Reserva[]>>(this.basePath, { params });
  }

  cambiarEstado(idReserva: number, estado: string, notasInternas?: string): Observable<ApiResponse<Reserva>> {
    return this.http.put<ApiResponse<Reserva>>(`${this.basePath}/${idReserva}/estado`, { Estado: estado, NotasInternas: notasInternas });
  }

  obtenerConfiguracionPublica(): Observable<ApiResponse<ConfiguracionReservas>> {
    return this.http.get<ApiResponse<ConfiguracionReservas>>(`${this.publicPath}/configuracion`);
  }

  disponibilidad(fecha: string, personas: number): Observable<ApiResponse<DisponibilidadReserva>> {
    const params = new HttpParams().set('Fecha', fecha).set('Personas', personas);
    return this.http.get<ApiResponse<DisponibilidadReserva>>(`${this.publicPath}/disponibilidad`, { params });
  }

  crearPublica(request: CrearReservaPublicaRequest): Observable<ApiResponse<ReservaCreada>> {
    return this.http.post<ApiResponse<ReservaCreada>>(this.publicPath, request);
  }

  cancelarPublica(codigo: string, tokenGestion: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.publicPath}/${codigo}/cancelar`, { TokenGestion: tokenGestion });
  }
}
