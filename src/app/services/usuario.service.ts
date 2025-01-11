
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
    private basePath = environment.apiUrl + '/Usuario/';

  constructor(private http: HttpClient) {}

  getUsuarioAuth(idNivel: string, clave: string): Observable<ApiResponse<Usuario>> {
    return this.http.get<ApiResponse<Usuario>>(this.basePath + 'GetUsuarioAuth/' + idNivel + '/' + clave);
  }
}
