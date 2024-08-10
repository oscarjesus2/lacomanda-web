
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoDocCliente } from '../models/tipodoccliente.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoDocClienteService {
    private basePath = environment.apiUrl + '/tipodoccliente/';

  constructor(private http: HttpClient) {}

  getTipoDocClientes(): Observable<TipoDocCliente[]> {
    return this.http.get<[TipoDocCliente]>(this.basePath + 'listar');
}
}
