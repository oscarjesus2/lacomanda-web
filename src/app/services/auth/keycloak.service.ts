import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from 'src/environments/environment';

/**
 * Wrapper de keycloak-js para el flujo Authorization Code + PKCE.
 *
 * El realm es dinámico (un realm por tenant), así que se crea una instancia
 * de Keycloak por operación, con el realm del tenant seleccionado. keycloak-js
 * persiste el estado del callback (state, code_verifier) en el navegador, por
 * lo que una instancia nueva tras el redirect puede completar el intercambio.
 */
@Injectable({ providedIn: 'root' })
export class KeycloakService {

  private kc: Keycloak | null = null;

  private create(realm: string): Keycloak {
    return new Keycloak({
      url:      environment.keycloak.url,
      realm,
      clientId: environment.keycloak.clientId,
    });
  }

  /** URL a la que Keycloak devuelve tras autenticar. */
  private get loginRedirectUri(): string {
    return `${window.location.origin}/iniciar-sesion`;
  }

  /**
   * Inicia el login por redirect contra el realm del tenant.
   * Redirige el navegador a la página de Keycloak (no retorna en la práctica).
   */
  async login(realm: string): Promise<void> {
    this.kc = this.create(realm);
    await this.kc.init({ pkceMethod: 'S256', checkLoginIframe: false });
    await this.kc.login({ redirectUri: this.loginRedirectUri });
  }

  /**
   * Completa el login tras volver de Keycloak. Debe llamarse con el mismo realm
   * usado en login(). Devuelve los tokens si la autenticación fue exitosa,
   * o null si no había un callback válido en la URL.
   */
  async completeLogin(realm: string): Promise<{ token: string; refreshToken: string } | null> {
    this.kc = this.create(realm);
    const authenticated = await this.kc.init({
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });

    if (authenticated && this.kc.token && this.kc.refreshToken) {
      return { token: this.kc.token, refreshToken: this.kc.refreshToken };
    }
    return null;
  }

  /**
   * Dispara el cambio de contraseña directamente en la página de Keycloak
   * (Application-Initiated Action UPDATE_PASSWORD). El usuario ya tiene sesión
   * SSO en Keycloak desde el login, así que Keycloak solo pide la contraseña
   * actual y la nueva, y devuelve al usuario a redirectUri.
   */
  async beginPasswordUpdate(realm: string, redirectUri?: string): Promise<void> {
    this.kc = this.create(realm);
    await this.kc.init({ pkceMethod: 'S256', checkLoginIframe: false });
    await this.kc.login({
      action: 'UPDATE_PASSWORD',
      redirectUri: redirectUri ?? window.location.href,
    });
  }
}
