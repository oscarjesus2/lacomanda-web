
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarjeta } from '../models/tarjeta.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TarjetaService {
    private basePath = environment.apiUrl + '/tarjeta/';

  constructor(private http: HttpClient) {}

  getTarjeta(): Observable<Tarjeta[]> {
    return this.http.get<[Tarjeta]>(this.basePath + 'listar');
  }

  getTarjeta_SocioNegocio(idPedidoCobrar: number, nroCuentaCobrar: number): Observable<Tarjeta[]> {
    return this.http.get<[Tarjeta]>(this.basePath + 'listar_x_socionegocio/' +idPedidoCobrar + '/' + nroCuentaCobrar);
  }
}
