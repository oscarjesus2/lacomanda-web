
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
    private basePath = environment.apiUrl + '/usuario';

  constructor(private http: HttpClient) {}

  getUsuarioAuth(idNivel: number, clave: string): Observable<ApiResponse<Usuario>> {
    return this.http.get<ApiResponse<Usuario>>(this.basePath + '/GetUsuarioAuth/' + idNivel + '/' + clave);
  }

  getAllUsuarios(): Observable<ApiResponse<Usuario[]>> {
    return this.http.get<ApiResponse<Usuario[]>>(this.basePath );
  }
  
  getUsuario(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.basePath }/${id}`);
  }

  createUsuario(usuario: Usuario): Observable<any> {
    return this.http.post<Usuario>(this.basePath , usuario);
  }

  updateUsuario(usuario: Usuario): Observable<any> {
    return this.http.put<Usuario>(`${this.basePath}/${usuario.IdUsuario}`, usuario);
  }
  
  deleteUsuario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }

}
