
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioUpdateDto, CambiarPasswordDto } from '../models/usuario.models';
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
    return this.http.get<ApiResponse<Usuario[]>>(this.basePath);
  }

  getUsuario(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.basePath}/${id}`);
  }

  createUsuario(usuario: Usuario): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(this.basePath, usuario);
  }

  /** PUT /api/Usuario/{id} — actualiza datos sin contraseña */
  updateUsuario(usuario: Usuario): Observable<ApiResponse<Usuario>> {
    const dto: UsuarioUpdateDto = {
      NombreUsuario: usuario.NombreUsuario,
      Email:         usuario.Email,
      Activo:        usuario.Activo,
      IdNivel:       usuario.IdNivel,
      IdEmpleado:    usuario.IdEmpleado,
    };
    return this.http.put<ApiResponse<Usuario>>(`${this.basePath}/${usuario.IdUsuario}`, dto);
  }

  /** PUT /api/Usuario/{id}/cambiar-password */
  cambiarPassword(idUsuario: number, dto: CambiarPasswordDto): Observable<void> {
    return this.http.put<void>(`${this.basePath}/${idUsuario}/cambiar-password`, dto);
  }

  deleteUsuario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }
}
