import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  ConfiguracionReservas,
  CrearReservaPublicaRequest,
  DisponibilidadReserva,
  EspacioReserva,
  Reserva,
  ReservaCreada,
  SucursalReservaPublica
} from 'src/app/models/reservas.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly basePath = `${environment.apiUrl}/reservas`;
  private readonly publicPath = `${environment.apiUrl}/public/reservas`;
  private tenantId = '';

  constructor(private readonly http: HttpClient) {}

  listarSucursalesPublicas(): Observable<ApiResponse<SucursalReservaPublica[]>> {
    return this.http.get<ApiResponse<SucursalReservaPublica[]>>(
      `${this.publicPath}/sucursales`,
      { headers: this.tenantHeaders(false) }
    );
  }

  seleccionarSucursal(tenantId: string): void {
    this.tenantId = tenantId.trim();
  }

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
    return this.http.get<ApiResponse<ConfiguracionReservas>>(
      `${this.publicPath}/configuracion`,
      { headers: this.tenantHeaders() }
    );
  }

  disponibilidad(fecha: string, personas: number): Observable<ApiResponse<DisponibilidadReserva>> {
    const params = new HttpParams().set('Fecha', fecha).set('Personas', personas);
    return this.http.get<ApiResponse<DisponibilidadReserva>>(`${this.publicPath}/disponibilidad`, {
      params,
      headers: this.tenantHeaders()
    });
  }

  crearPublica(request: CrearReservaPublicaRequest): Observable<ApiResponse<ReservaCreada>> {
    return this.http.post<ApiResponse<ReservaCreada>>(this.publicPath, request, {
      headers: this.tenantHeaders()
    });
  }

  cancelarPublica(codigo: string, tokenGestion: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.publicPath}/${codigo}/cancelar`,
      { TokenGestion: tokenGestion },
      { headers: this.tenantHeaders() }
    );
  }

  private tenantHeaders(incluirTenant = true): HttpHeaders {
    let headers = new HttpHeaders({ 'X-Tenant-Host': window.location.hostname });
    if (incluirTenant && this.tenantId) {
      headers = headers.set('X-Tenant-Id', this.tenantId);
    }
    return headers;
  }
}
