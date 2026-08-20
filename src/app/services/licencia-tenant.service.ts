import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, catchError, shareReplay } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { LicenciaTenant } from '../models/licencia-tenant.models';
import {
  CARACTERISTICAS_LICENCIA,
  CodigoCaracteristica,
  ExigenciaLicencia,
  expandirExigencia,
} from '../constants/caracteristicas-licencia';
import { environment } from 'src/environments/environment';

/**
 * Resultado de resolver la licencia del tenant.
 *
 * Se distinguen tres situaciones que antes se confundían en un único `null`:
 *  - `licencia` presente        → aplicar sus características.
 *  - `sinSuscripcion`           → el backend respondió, pero el tenant no tiene
 *                                 suscripción (tenant legacy).
 *  - `error`                    → no se pudo resolver (red, 401, 403…).
 */
export interface EstadoLicenciaTenant {
  licencia: LicenciaTenant | null;
  sinSuscripcion: boolean;
  error: boolean;
  habilitadas: ReadonlySet<string>;
}

@Injectable({ providedIn: 'root' })
export class LicenciaTenantService {
  /**
   * Qué hacer cuando `/licencia/me` responde sin licencia.
   *
   * No es un flag que haya que sincronizar a mano con el backend: se deduce.
   * `TenantSubscriptionAccessMiddleware` corre en toda petición autenticada,
   * incluida esta, y rechaza con `SubscriptionNotActive` a los tenants sin
   * suscripción salvo que `AllowLegacyTenantsWithoutSubscription` esté activo.
   *
   * Por tanto, recibir `null` implica que el bypass del backend está encendido,
   * y entonces la API concede todas las características. Ponerlo en `false`
   * dejaría la interfaz más restrictiva que la API y ocultaría opciones que el
   * servidor sí permite.
   */
  private static readonly PERMITIR_TENANTS_SIN_SUSCRIPCION = true;

  /**
   * Características que un tenant legacy sin suscripción no obtiene aunque
   * `PERMITIR_TENANTS_SIN_SUSCRIPCION` esté activo, porque nunca formaron parte
   * del producto anterior a las licencias.
   */
  private static readonly EXCLUIDAS_SIN_SUSCRIPCION: ReadonlySet<string> =
    new Set<string>([CARACTERISTICAS_LICENCIA.PersonalControlHorario]);

  private readonly basePath = `${environment.apiUrl}/licencia/me`;

  /**
   * Petición compartida. `refCount: false` mantiene el valor cacheado aunque no
   * queden suscriptores, de modo que los componentes que se abren y cierran
   * (diálogos de mantenimiento) no vuelven a golpear `/licencia/me`.
   */
  private estado$?: Observable<EstadoLicenciaTenant>;

  constructor(private readonly http: HttpClient) {}

  /** Estado de licencia del tenant, resuelto una sola vez y compartido. */
  obtenerEstado(): Observable<EstadoLicenciaTenant> {
    if (!this.estado$) {
      this.estado$ = this.http
        .get<ApiResponse<LicenciaTenant | null>>(this.basePath)
        .pipe(
          map(respuesta => this.construirEstado(respuesta?.Data ?? null)),
          catchError(() =>
            of<EstadoLicenciaTenant>({
              licencia: null,
              sinSuscripcion: false,
              error: true,
              habilitadas: new Set<string>(),
            }),
          ),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.estado$;
  }

  /** Licencia efectiva, o `null` si el tenant no tiene suscripción. */
  obtenerLicencia(): Observable<LicenciaTenant | null> {
    return this.obtenerEstado().pipe(map(estado => estado.licencia));
  }

  /**
   * Indica si la licencia cubre la exigencia, resolviendo sus dependencias.
   *
   * Un fallo al resolver la licencia deniega: es preferible ocultar una opción
   * contratada que mostrar una que la API rechazará con 403.
   */
  tieneCaracteristica(exigencia: ExigenciaLicencia): Observable<boolean> {
    return this.obtenerEstado().pipe(
      map(estado => this.evaluar(estado, exigencia)),
    );
  }

  /** Versión síncrona para un estado ya resuelto. */
  evaluar(estado: EstadoLicenciaTenant, exigencia: ExigenciaLicencia): boolean {
    if (estado.error) {
      return false;
    }

    const requeridas = expandirExigencia(exigencia);

    if (estado.sinSuscripcion) {
      return (
        LicenciaTenantService.PERMITIR_TENANTS_SIN_SUSCRIPCION &&
        !requeridas.some(codigo =>
          LicenciaTenantService.EXCLUIDAS_SIN_SUSCRIPCION.has(codigo),
        )
      );
    }

    return requeridas.every(codigo => estado.habilitadas.has(codigo));
  }

  /** Límite numérico de una característica, o `null` si no aplica. */
  obtenerLimite(codigo: CodigoCaracteristica): Observable<number | null> {
    return this.obtenerEstado().pipe(
      map(
        estado =>
          estado.licencia?.Caracteristicas?.find(c => c.Codigo === codigo)
            ?.Limite ?? null,
      ),
    );
  }

  /**
   * Descarta el valor cacheado. Debe llamarse tras cambiar de plan o de tenant
   * para que la siguiente lectura vuelva a consultar al backend.
   */
  invalidar(): void {
    this.estado$ = undefined;
  }

  private construirEstado(
    licencia: LicenciaTenant | null,
  ): EstadoLicenciaTenant {
    return {
      licencia,
      sinSuscripcion: licencia == null,
      error: false,
      habilitadas: new Set<string>(
        licencia?.Caracteristicas?.filter(c => c.Habilitada).map(
          c => c.Codigo,
        ) ?? [],
      ),
    };
  }
}
