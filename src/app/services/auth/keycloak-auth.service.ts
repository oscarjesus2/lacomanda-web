import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Usuario } from 'src/app/models/usuario.models';

export interface KeycloakTokenResponse {
  access_token:       string;
  refresh_token:      string;
  expires_in:         number;
  refresh_expires_in: number;
  token_type:         string;
}

interface KeycloakPayload {
  sub:                string;
  preferred_username: string;
  realm_access?:      { roles: string[] };
  exp:                number;
}

/** Mapeo de roles de Keycloak a IdNivel interno */
const ROLE_TO_NIVEL: Record<string, number> = {
  admin: 1,
  caja:  2,
  mozo:  3,
};

/** Mapeo de roles de Keycloak a TipoCompu */
const ROLE_TO_TIPOCOMPU: Record<string, number> = {
  admin: 0,
  caja:  2,
  mozo:  1,
};

@Injectable({ providedIn: 'root' })
export class KeycloakAuthService {

  constructor(private http: HttpClient) {}

  // ── URLs dinámicas por realm ───────────────────────────────────────────────

  private tokenUrl(realm: string): string {
    return `${environment.keycloak.url}/realms/${realm}/protocol/openid-connect/token`;
  }

  private logoutUrl(realm: string): string {
    return `${environment.keycloak.url}/realms/${realm}/protocol/openid-connect/logout`;
  }

  // ── Operaciones ───────────────────────────────────────────────────────────

  // El login por ROPC (grant_type=password) fue eliminado: las credenciales se
  // ingresan ahora en la página de Keycloak vía Authorization Code + PKCE
  // (ver KeycloakService). Aquí solo quedan refresh y logout, que operan con el
  // refresh_token obtenido en ese flujo — grants estándar, no ROPC.

  /** Renueva el access_token. El realm viene del TenantID de la sesión activa. */
  refresh(refreshToken: string, realm: string): Observable<KeycloakTokenResponse> {
    const body = new HttpParams()
      .set('grant_type',    'refresh_token')
      .set('client_id',     environment.keycloak.clientId)
      .set('refresh_token', refreshToken);

    return this.http.post<KeycloakTokenResponse>(this.tokenUrl(realm), body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  /** Invalida la sesión en Keycloak (logout SSO). */
  logout(refreshToken: string, realm: string): Observable<void> {
    const body = new HttpParams()
      .set('client_id',     environment.keycloak.clientId)
      .set('refresh_token', refreshToken);

    return this.http.post<void>(this.logoutUrl(realm), body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  // ── Helpers de token ──────────────────────────────────────────────────────

  /** Decodifica el payload del JWT (sin verificar firma). */
  decodePayload(token: string): KeycloakPayload {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as KeycloakPayload;
  }

  /** Retorna los realm roles del token. */
  getRoles(token: string): string[] {
    return this.decodePayload(token).realm_access?.roles ?? [];
  }

  /**
   * Construye un objeto Usuario mínimo a partir del JWT de Keycloak,
   * compatible con el modelo de Session existente.
   */
  buildUsuarioFromToken(token: string): Usuario {
    const payload = this.decodePayload(token);
    const roles   = payload.realm_access?.roles ?? [];
    const businessRole = ['admin', 'caja', 'mozo'].find(r => roles.includes(r));

    const usuario         = new Usuario();
    usuario.NombreUsuario = payload.preferred_username;
    usuario.IdNivel       = ROLE_TO_NIVEL[businessRole] ?? 0;
    usuario.TipoCompu     = ROLE_TO_TIPOCOMPU[businessRole] ?? -1;
    usuario.Activo        = true;
    usuario.Token         = token;
    return usuario;
  }

  /** Ruta de navegación según el rol principal del usuario. */
  getTargetRoute(token: string): string {
    const roles = this.getRoles(token);
    if (roles.includes('admin')) return '/dashboard';
    if (roles.includes('caja'))  return '/caja';
    if (roles.includes('mozo'))  return '/mozo';
    return '/dashboard';
  }
}
