import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { NivelUsuarioEnum } from '../enums/enum';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';
import { StorageService } from '../services/storage.service';
import { UsuarioService } from '../services/usuario.service';

@Injectable({ providedIn: 'root' })
export class DashboardReportesGuard {
  constructor(
    private readonly router: Router,
    private readonly storageService: StorageService,
    private readonly keycloakAuth: KeycloakAuthService,
    private readonly usuarioService: UsuarioService,
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | UrlTree | boolean {
    const token = this.storageService.getCurrentToken();
    if (!this.keycloakAuth.isTokenActive(token, 0)) {
      return this.router.createUrlTree(['/iniciar-sesion']);
    }

    const usuario = this.storageService.getCurrentUser();
    if (usuario?.IdNivel === NivelUsuarioEnum.Gerente ||
        usuario?.EsUsuarioSoporteLaComanda === true) {
      return true;
    }

    if (usuario?.IdNivel !== NivelUsuarioEnum.Administrador) {
      return this.rutaDeRepliegue();
    }

    return this.usuarioService.getUsuarioActual().pipe(
      map(respuesta => {
        const perfil = respuesta?.Data;
        if (!perfil?.Activo) {
          return this.rutaDeRepliegue();
        }

        return perfil.EsUsuarioSoporteLaComanda === true ||
          perfil.IdNivel === NivelUsuarioEnum.Gerente ||
          (perfil.IdNivel === NivelUsuarioEnum.Administrador &&
            perfil.PuedeVerDashboardReportes)
          ? true
          : this.rutaDeRepliegue();
      }),
      catchError(() => of(this.rutaDeRepliegue())),
    );
  }

  private rutaDeRepliegue(): UrlTree {
    return this.router.createUrlTree(['/dashboard']);
  }
}
