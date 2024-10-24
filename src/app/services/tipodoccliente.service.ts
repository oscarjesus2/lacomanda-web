
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoDocCliente } from '../models/tipodoccliente.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class TipoDocClienteService {
    private basePath = environment.apiUrl + '/tipodoccliente/';

  constructor(private http: HttpClient) {}

  getTipoDocClientes(): Observable<ApiResponse<TipoDocCliente[]>> {
    
    return this.http.get<ApiResponse<TipoDocCliente[]>>(this.basePath + 'listar');
  }
}
