import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, map } from 'rxjs';
import { LicenciaTenantService } from '../services/licencia-tenant.service';
import { StorageService } from '../services/storage.service';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';
import { ExigenciaLicencia } from '../constants/caracteristicas-licencia';

/**
 * Guard de licencia para LaComanda.
 *
 * Uso en rutas:
 *   canActivate: [RoleGuard, LicenseGuard],
 *   data: { roles: ['admin'], feature: CARACTERISTICAS_LICENCIA.OperacionCaja }
 *
 * `feature` acepta un código o un array de códigos, que se evalúan en AND igual
 * que `RequireLicenseFeatureAttribute` en el backend. Las dependencias del
 * catálogo se resuelven solas.
 *
 * Nota: solo debe aplicarse a rutas autenticadas. `/licencia/me` exige token, de
 * modo que en las rutas públicas (mesa QR, reservas online) la licencia se
 * comprueba en el backend, no aquí.
 */
@Injectable({ providedIn: 'root' })
export class LicenseGuard {
  constructor(
    private readonly router: Router,
    private readonly licenciaTenantService: LicenciaTenantService,
    private readonly storageService: StorageService,
    private readonly keycloakAuth: KeycloakAuthService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const exigencia: ExigenciaLicencia | undefined = route.data?.['feature'];

    // Una ruta sin `feature` no impone licencia.
    if (!exigencia) {
      return true;
    }

    return this.licenciaTenantService
      .tieneCaracteristica(exigencia)
      .pipe(map(permitido => permitido || this.rutaDeRepliegue()));
  }

  /**
   * Destino cuando la licencia no cubre la ruta.
   *
   * Se eligen rutas que nunca llevan `LicenseGuard`, de modo que una denegación
   * no pueda encadenar redirecciones.
   */
  private rutaDeRepliegue(): UrlTree {
    const token = this.storageService.getCurrentToken();
    const roles = token ? this.keycloakAuth.getRoles(token) : [];

    return roles.includes('admin')
      ? this.router.createUrlTree(['/administracion'])
      : this.router.createUrlTree(['/iniciar-sesion']);
  }
}
