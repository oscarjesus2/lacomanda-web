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
import { CajaOfflineSesionService } from '../offline/caja-offline-sesion.service';

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
    private readonly sesionCaja: CajaOfflineSesionService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    if (this.sesionCaja.permiteRuta(state.url)) return true;
    if (this.sesionCaja.activa) return this.router.createUrlTree([this.sesionCaja.rutaVenta]);
    if (this.sesionCaja.requiereSeleccion) return this.router.createUrlTree(['/offline']);
    const exigencia: ExigenciaLicencia | undefined = route.data?.['feature'];

    // Una ruta sin `feature` no impone licencia.
    if (!exigencia) {
      return true;
    }

    // El guard de licencia nunca debe llamar a un endpoint protegido si la
    // sesión local ya venció. Los guards de una misma ruta pueden comenzar a
    // resolverse antes de que la redirección de RoleGuard haya finalizado.
    const token = this.storageService.getCurrentToken();
    if (!this.keycloakAuth.isTokenActive(token, 0)) {
      return this.router.createUrlTree(['/iniciar-sesion']);
    }

    return this.licenciaTenantService.obtenerEstado().pipe(
      map(estado => {
        if (estado.error) {
          // El interceptor ya redirige una sesión vencida o una suscripción bloqueada.
          if (!this.storageService.getCurrentToken()) return false;
          return this.volverAlLogin('licencia-no-disponible', state.url);
        }
        return this.licenciaTenantService.evaluar(estado, exigencia) || this.rutaDeRepliegue(state.url);
      }),
    );
  }

  /**
   * Destino cuando la licencia no cubre la ruta.
   *
   * Se eligen rutas que nunca llevan `LicenseGuard`, de modo que una denegación
   * no pueda encadenar redirecciones.
   */
  private rutaDeRepliegue(returnUrl: string): UrlTree {
    const token = this.storageService.getCurrentToken();
    const roles = token ? this.keycloakAuth.getRoles(token) : [];

    return roles.includes('admin') || roles.includes('gerente')
      ? this.router.createUrlTree(['/dashboard'])
      : this.volverAlLogin('sin-licencia', returnUrl);
  }

  private volverAlLogin(acceso: 'licencia-no-disponible' | 'sin-licencia', returnUrl: string): UrlTree {
    return this.router.createUrlTree(['/iniciar-sesion'], { queryParams: { acceso, returnUrl } });
  }
}
