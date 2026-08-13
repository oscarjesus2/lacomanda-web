
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarjeta, TarjetaGuardar } from '../models/tarjeta.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TarjetaService {
    private basePath = environment.apiUrl + '/tarjeta';

  constructor(private http: HttpClient) {}

  getTarjeta(): Observable<Tarjeta[]> {
    return this.http.get<[Tarjeta]>(this.basePath);
  }

  getTarjeta_SocioNegocio(idPedidoCobrar: number, nroCuentaCobrar: number): Observable<Tarjeta[]> {
    return this.http.get<[Tarjeta]>(this.basePath + '/listar_x_socionegocio/' +idPedidoCobrar + '/' + nroCuentaCobrar);
  }

  crearTarjeta(tarjeta: TarjetaGuardar): Observable<ApiResponse<Tarjeta>> {
    return this.http.post<ApiResponse<Tarjeta>>(this.basePath, tarjeta);
  }

  actualizarTarjeta(idTarjeta: number, tarjeta: TarjetaGuardar): Observable<ApiResponse<Tarjeta>> {
    return this.http.put<ApiResponse<Tarjeta>>(`${this.basePath}/${idTarjeta}`, tarjeta);
  }

  eliminarTarjeta(idTarjeta: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${idTarjeta}`);
  }
}
