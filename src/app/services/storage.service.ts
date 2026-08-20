import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '../models/session.models';
import { Usuario } from '../models/usuario.models';
import { KeycloakAuthService } from './auth/keycloak-auth.service';
import { LicenciaTenantService } from './licencia-tenant.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly store = localStorage;
  private currentSession: Session | null = null;

  constructor(
    private router: Router,
    private keycloakAuth: KeycloakAuthService,
    private injector: Injector,
  ) {
    this.currentSession = this.loadSessionData();
  }

  // ── Sesión ────────────────────────────────────────────────────────────────

  setCurrentSession(session: Session): void {
    this.currentSession = session;
    this.store.setItem('currentSession', JSON.stringify(session));
  }

  loadSessionData(): Session | null {
    const raw = this.store.getItem('currentSession');
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  removeCurrentSession(): void {
    this.store.removeItem('currentSession');
    this.currentSession = null;
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  getCurrentToken(): string | null {
    return this.currentSession?.Token ?? null;
  }

  getRefreshToken(): string | null {
    return this.currentSession?.RefreshToken ?? null;
  }

  /** Actualiza el access_token (y opcionalmente el refresh_token) en la sesión persistida. */
  updateToken(accessToken: string, refreshToken?: string): void {
    if (!this.currentSession) return;
    this.currentSession.Token = accessToken;
    if (refreshToken) this.currentSession.RefreshToken = refreshToken;
    this.store.setItem('currentSession', JSON.stringify(this.currentSession));
  }

  // ── Usuario / extras ──────────────────────────────────────────────────────

  getCurrentUser(): Usuario | null {
    return this.currentSession?.User ?? null;
  }

  getCurrentIP(): string | null {
    return this.currentSession?.Ip ?? null;
  }

  getCurrentNombreSucursal(): string | null {
    return this.currentSession?.nombresucursal ?? null;
  }

  getBoletaRapida(): boolean {
    return this.currentSession?.boletaRapida ?? false;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentToken();
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  logout(): void {
    const refreshToken = this.getRefreshToken();
    const realm        = this.currentSession?.TenantID ?? '';
    this.removeCurrentSession();

    // La licencia se cachea por sesión: sin esto, entrar con otro restaurante
    // reutilizaría las características del anterior.
    // Se resuelve de forma diferida porque LicenciaTenantService depende de
    // HttpClient, cuyo interceptor depende a su vez de este servicio.
    this.injector.get(LicenciaTenantService).invalidar();

    if (refreshToken && realm) {
      // Invalidar sesión en Keycloak (fire & forget — no bloqueamos la navegación)
      this.keycloakAuth.logout(refreshToken, realm).subscribe({
        error: () => { /* Keycloak puede estar caído — ignoramos */ }
      });
    }

    this.router.navigate(['/iniciar-sesion']);
  }
}
