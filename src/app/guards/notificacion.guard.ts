import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';
import { StorageService } from '../services/storage.service';

/** El servidor valida propietario, permisos actuales y licencia de cada notificación. */
@Injectable({ providedIn: 'root' })
export class NotificacionGuard {
  constructor(private readonly router: Router, private readonly storage: StorageService, private readonly auth: KeycloakAuthService) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.auth.isTokenActive(this.storage.getCurrentToken(), 0)
      || this.router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: state.url } });
  }
}
