import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';
import { EstacionTipoEnum } from '../enums/enum';

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
 *  - 'gerente' conserva acceso general y usa Caja o Mozo según su estación
 *  - 'admin' conserva su acceso general previo
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

    if (!this.keycloakAuth.isTokenActive(token, 0)) {
      return this.router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: state.url } });
    }

    const userRoles = this.keycloakAuth.getRoles(token);
    const isAdmin   = userRoles.includes('admin');
    const isGerente = userRoles.includes('gerente');
    const allowedRoles: string[] = route.data?.['roles'] ?? [];
    const esRutaDeCajaOMozo = allowedRoles.some(
      role => role === 'caja' || role === 'mozo',
    );

    if (isGerente && esRutaDeCajaOMozo) {
      const tipoEstacion = this.storageService.getCurrentUser()?.TipoCompu;
      const coincideConCaja =
        allowedRoles.includes('caja') &&
        tipoEstacion === EstacionTipoEnum.CAJA;
      const coincideConMozo =
        allowedRoles.includes('mozo') &&
        tipoEstacion === EstacionTipoEnum.MOZO;

      if (coincideConCaja || coincideConMozo) return true;

      return this.router.createUrlTree([this.homeRouteFor(userRoles)]);
    }

    // Ambos conservan su acceso general fuera de las rutas operativas de Caja
    // y Mozo. El gerente accede a ellas solo desde la estación correspondiente.
    if (isAdmin || isGerente) return true;

    const hasAccess = allowedRoles.some(r => userRoles.includes(r));

    if (hasAccess) return true;

    // Sin acceso → redirigir a la ruta del rol del usuario
    return this.router.createUrlTree([this.homeRouteFor(userRoles)]);
  }

  /** Ruta de inicio según el rol del usuario. */
  private homeRouteFor(roles: string[]): string {
    if (roles.includes('gerente')) return '/dashboard';
    if (roles.includes('caja')) return '/caja';
    if (roles.includes('mozo')) return '/mozo';
    return '/iniciar-sesion';
  }

}
