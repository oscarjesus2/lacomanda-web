
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoIdentidad } from '../models/tipoIdentidad.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class TipoDocClienteService {
    private basePath = environment.apiUrl + '/tipoidentidad/';

  constructor(private http: HttpClient) {}

  getTipoDocClientes(): Observable<ApiResponse<TipoIdentidad[]>> {
    
    return this.http.get<ApiResponse<TipoIdentidad[]>>(this.basePath + 'listar');
  }
}
