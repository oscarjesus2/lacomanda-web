import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';

/**
 * Guard de roles para LaComanda.
 *
 * Uso en rutas:
 *   canActivate: [RoleGuard],
 *   data: { roles: ['admin', 'caja'] }   ← roles que pueden acceder
 *
 * Reglas:
 *  - Sin sesión / token expirado → /iniciar-sesion
 *  - Con sesión pero sin rol permitido → redirige a la ruta propia del rol
 *  - 'admin' siempre puede acceder a cualquier ruta protegida
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard {

  constructor(
    private router: Router,
    private storageService: StorageService,
    private keycloakAuth: KeycloakAuthService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const token = this.storageService.getCurrentToken();

    if (!token || this.isTokenExpired(token)) {
      return this.router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: state.url } });
    }

    const userRoles = this.keycloakAuth.getRoles(token);
    const isAdmin   = userRoles.includes('admin');

    // Admin siempre pasa
    if (isAdmin) return true;

    const allowedRoles: string[] = route.data?.['roles'] ?? [];
    const hasAccess = allowedRoles.some(r => userRoles.includes(r));

    if (hasAccess) return true;

    // Sin acceso → redirigir a la ruta del rol del usuario
    return this.router.createUrlTree([this.homeRouteFor(userRoles)]);
  }

  /** Ruta de inicio según el rol del usuario. */
  private homeRouteFor(roles: string[]): string {
    if (roles.includes('caja')) return '/caja';
    if (roles.includes('mozo')) return '/mozo';
    return '/iniciar-sesion';
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() > payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
