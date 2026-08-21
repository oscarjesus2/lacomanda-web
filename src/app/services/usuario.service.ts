
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioUpdateDto } from '../models/usuario.models';
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

  getUsuarioActual(): Observable<ApiResponse<Usuario>> {
    return this.http.get<ApiResponse<Usuario>>(`${this.basePath}/me`);
  }

  actualizarCulturaPropia(cultura: string | null): Observable<ApiResponse<Usuario>> {
    return this.http.put<ApiResponse<Usuario>>(`${this.basePath}/me/cultura`, {
      Cultura: cultura,
    });
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
      Email:         usuario.Email,
      Activo:        usuario.Activo,
      IdNivel:       usuario.IdNivel,
      IdEmpleado:    usuario.IdEmpleado,
    };
    return this.http.put<ApiResponse<Usuario>>(`${this.basePath}/${usuario.IdUsuario}`, dto);
  }

  solicitarRestablecimientoPassword(idUsuario: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.basePath}/${idUsuario}/restablecer-password`,
      {},
    );
  }

  // cambiarPassword() (PUT .../cambiar-password) fue eliminado: el cambio de
  // contraseña se realiza ahora directamente en Keycloak (UPDATE_PASSWORD),
  // sin que la contraseña pase por el frontend ni por el backend.

  deleteUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * POST /api/Usuario/forgot-password
   * El backend debe:
   *  1. Buscar el usuario en Keycloak: GET /admin/realms/{tenantId}/users?username={username}
   *  2. Llamar: PUT /admin/realms/{tenantId}/users/{userId}/execute-actions-email
   *     body: ["UPDATE_PASSWORD"]
   * Siempre responde 200 (no confirmar si el usuario existe — seguridad).
   */
  forgotPassword(username: string, tenantId: string): Observable<void> {
    return this.http.post<void>(`${this.basePath}/forgot-password`, {
      Username: username,
      TenantId: tenantId,
    });
  }
}
