import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

import { MatDialog } from '@angular/material/dialog';
import { Observable, throwError } from 'rxjs';
import {
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  tap
} from 'rxjs/operators';

import Swal from 'sweetalert2';

import { StorageService } from '../services/storage.service';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';
import { NotificationService } from '../services/notification.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { BackendStatusService } from '../services/backend-status.service';
import { environment } from 'src/environments/environment';
import { DeviceIdentifierService } from '../services/device-identifier.service';

interface ApiErrorResponse {
  Success?: boolean;
  StatusCode?: number;
  Message?: string;
  ErrorCode?: string;
  Data?: unknown;

  // Compatibilidad con ProblemDetails/JSON camelCase.
  status?: number;
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiRequestInterceptor implements HttpInterceptor {

  /**
   * Una sola petición de refresh compartida entre todas las solicitudes
   * que reciban 401 simultáneamente.
   */
  private refreshRequest$: Observable<string> | null = null;

  /** Evita mostrar varios avisos cuando las cargas iniciales fallan a la vez. */
  private subscriptionBlockDialogOpen = false;

  /** Evita repetir el cierre si varias consultas detectan a la vez la desvinculación. */
  private stationRevokedDialogOpen = false;

  private readonly UTC_DATE_REGEX =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

  constructor(
    private storageService: StorageService,
    private keycloakAuth: KeycloakAuthService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private spinnerService: NgxSpinnerService,
    private backendStatus: BackendStatusService,
    private deviceIdentifier: DeviceIdentifierService,
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    const isUnauthenticatedEndpoint = this.isUnauthenticatedEndpoint(request);

    if (!isUnauthenticatedEndpoint) {
      request = this.addAuthHeaders(request);
    }

    return this.processResponse(next.handle(request)).pipe(
      catchError((error: HttpErrorResponse) =>
        this.handleError(
          error,
          request,
          next,
          isUnauthenticatedEndpoint,
          true
        )
      )
    );
  }

  /**
   * Procesamiento común para respuestas originales y peticiones
   * reintentadas después de renovar el token.
   */
  private processResponse(
    source: Observable<HttpEvent<any>>
  ): Observable<HttpEvent<any>> {

    return source.pipe(
      tap(event => {
        // No marcar el backend como disponible con HttpSentEvent.
        // Esperar una respuesta HTTP real.
        if (event instanceof HttpResponse) {
          this.backendStatus.markUp();
        }
      }),

      map(event => {
        if (event instanceof HttpResponse && event.body) {
          return event.clone({
            body: this.convertDates(event.body)
          });
        }

        return event;
      })
    );
  }

  private handleError(
    error: HttpErrorResponse,
    request: HttpRequest<any>,
    next: HttpHandler,
    isUnauthenticatedEndpoint: boolean,
    allowTokenRefresh: boolean
  ): Observable<never | HttpEvent<any>> {

    // Los errores de endpoints que no usan sesión los maneja su propio componente.
    if (isUnauthenticatedEndpoint) {
      this.spinnerService.hide();
      return throwError(() => error);
    }

    // Error de red, timeout, backend detenido o CORS.
    if (error.status === 0) {
      this.backendStatus.markDown();
      this.spinnerService.hide();

      // El banner global de BackendStatusService comunica la caída.
      return throwError(() => error);
    }

    // El backend respondió, aunque haya respondido con error.
    this.backendStatus.markUp();

    if (error.status === 402 && this.isSubscriptionAccessError(error)) {
      this.handleSubscriptionAccessError(error);
      this.spinnerService.hide();
      return throwError(() => error);
    }

    if (this.isRevokedStationAccess(error, request)) {
      this.handleRevokedStationAccess();
      return throwError(() => error);
    }

    // Renovación automática del token.
    if (error.status === 401 && allowTokenRefresh) {
      return this.handle401(request, next);
    }

    // Si el reintento después del refresh también devuelve 401,
    // no se debe intentar renovar indefinidamente.
    if (error.status === 401) {
      this.forceLogout();
      return throwError(() => error);
    }

    /*
     * Compatibilidad temporal con errores JWT que el backend todavía
     * pueda devolver incorrectamente como 500.
     *
     * Lo correcto es que el backend termine devolviendo 401.
     */
    if (error.status === 500 && this.isJwtAuthenticationFailure(error)) {
      this.notificationService.showWarning(
        'La sesión ya no es válida. Inicie sesión nuevamente.'
      );

      this.forceLogout();
      return throwError(() => error);
    }

    // El asistente contextual actualiza sus opciones en el propio panel cuando
    // otro equipo ocupa la misma estación unos instantes antes. Evitamos abrir
    // además un modal global para esa concurrencia esperable.
    if (this.isStationAvailabilityRace(error, request)) {
      this.spinnerService.hide();
      return throwError(() => error);
    }

    this.presentError(error);
    this.spinnerService.hide();

    /*
     * Importante: conservar HttpErrorResponse.
     *
     * No reemplazarlo por new Error(message), porque se perderían:
     * status, ErrorCode, Message, Data y errors.
     */
    return throwError(() => error);
  }

  private handle401(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    const refreshToken = this.storageService.getRefreshToken();

    if (!refreshToken) {
      this.forceLogout();
      return throwError(() => new Error('La sesión ha expirado.'));
    }

    if (!this.refreshRequest$) {
      const realm =
        this.storageService.getCurrentSession()?.TenantID ?? '';

      this.refreshRequest$ = this.keycloakAuth
        .refresh(refreshToken, realm)
        .pipe(
          map(response => {
            this.storageService.updateToken(
              response.access_token,
              response.refresh_token
            );

            return response.access_token;
          }),

          catchError(error => {
            this.forceLogout();
            return throwError(() => error);
          }),

          finalize(() => {
            this.refreshRequest$ = null;
          }),

          /*
           * Todas las peticiones que reciban 401 mientras se renueva
           * el token compartirán el mismo resultado.
           */
          shareReplay({
            bufferSize: 1,
            refCount: false
          })
        );
    }

    return this.refreshRequest$.pipe(
      switchMap(() => {
        const retryRequest = this.addAuthHeaders(request);

        return this.processResponse(next.handle(retryRequest)).pipe(
          catchError((retryError: HttpErrorResponse) =>
            this.handleError(
              retryError,
              retryRequest,
              next,
              false,
              false
            )
          )
        );
      })
    );
  }

  /**
   * Decide automáticamente cómo presentar cada categoría de error.
   */
  private presentError(error: HttpErrorResponse): void {

    // Error de validación producido por ASP.NET Core.
    if (this.isModelValidationError(error)) {
      this.handleValidationErrors(error.error.errors);
      return;
    }

    const message = this.getErrorMessage(error);

    switch (error.status) {

      case 400:
        // Solicitud o validación de negocio.
        this.notificationService.showWarning(message);
        return;

      case 403:
        // Las denegaciones de licencia son reglas comerciales recuperables:
        // conservar el mensaje del backend permite explicar qué característica
        // falta o qué límite se agotó. Un 403 de autorización normal continúa
        // presentándose como error.
        if (this.isLicenseAccessError(error)) {
          this.notificationService.showWarning(message);
        } else {
          this.notificationService.showError(message);
        }
        return;

      case 404:
        this.notificationService.showWarning(message);
        return;

      case 409:
        // Conflicto con el estado actual.
        this.notificationService.showWarning(message);
        return;

      case 422:
        // Regla de negocio incumplida.
        this.notificationService.showWarning(message);
        return;

      default:
        if (error.status >= 500) {
          this.notificationService.showError(message);
          return;
        }

        this.notificationService.showError(message);
    }
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const body = error.error as ApiErrorResponse | null;

    const backendMessage =
      body?.Message ||
      body?.detail ||
      body?.message;

    if (
      typeof backendMessage === 'string' &&
      backendMessage.trim().length > 0
    ) {
      return backendMessage.trim();
    }

    switch (error.status) {
      case 400:
        return 'La solicitud contiene información inválida.';

      case 403:
        return 'No tiene permisos para realizar esta acción.';

      case 404:
        return 'No se encontró la información solicitada.';

      case 409:
        return 'La operación entra en conflicto con el estado actual.';

      case 422:
        return 'No se puede completar la operación porque no cumple las reglas de negocio.';

      default:
        if (error.status >= 500) {
          return 'Ocurrió un error interno. Inténtelo nuevamente.';
        }

        return 'No se pudo completar la operación.';
    }
  }

  private isModelValidationError(
    error: HttpErrorResponse
  ): boolean {

    return (
      error.status === 400 &&
      error.error !== null &&
      typeof error.error === 'object' &&
      error.error.errors !== null &&
      typeof error.error.errors === 'object'
    );
  }

  private handleValidationErrors(
    errors: Record<string, string[]>
  ): void {

    const validationMessages: string[] = [];

    for (const key of Object.keys(errors ?? {})) {
      const field = this.getFriendlyFieldName(key);

      const messages = Array.isArray(errors[key])
        ? errors[key]
        : [String(errors[key])];

      for (const message of messages) {
        validationMessages.push(
          message.replace(`The ${key} field`, field)
        );
      }
    }

    if (validationMessages.length === 0) {
      this.notificationService.showWarning(
        'La solicitud contiene información inválida.'
      );
      return;
    }

    const html = validationMessages
      .map(message => `<li>${this.escapeHtml(message)}</li>`)
      .join('');

    Swal.fire({
      icon: 'warning',
      title: 'Revise la información',
      html: `<ul style="text-align:left">${html}</ul>`,
      confirmButtonText: 'Cerrar'
    });
  }

  private getFriendlyFieldName(fieldName: string): string {
    const fieldMap: Record<string, string> = {
      IdCaja: 'Caja',
      Moneda: 'Moneda',
      Cliente: 'Cliente',
      Direccion: 'Dirección',
      Referencia: 'Referencia',
      Observacion: 'Observación',
      IdTipoPedido: 'Tipo de pedido',
      'ListaPedidoDet[0].NroCupon': 'Número de cupón',
      'ListaPedidoDet[0].NombreCuenta': 'Nombre de la cuenta',
      'ListaPedidoDet[0].MotivoReimpresion':
        'Motivo de reimpresión'
    };

    return fieldMap[fieldName] || fieldName;
  }

  private isJwtAuthenticationFailure(
    error: HttpErrorResponse
  ): boolean {

    const data = error.error?.Data ?? '';

    return (
      typeof data === 'string' &&
      (
        data.includes('HandleAuthenticateAsync') ||
        data.includes('MultiTenantKeycloak') ||
        data.includes('JwtBearerHandler')
      )
    );
  }

  private isUnauthenticatedEndpoint(
    request: HttpRequest<any>
  ): boolean {

    return (
      request.url.includes('/protocol/openid-connect/token') ||
      request.url.includes('/api/Auth/login') ||
      request.url.includes('/api/Tenant') ||
      request.url.includes('/api/public/reservas')
    );
  }

  private addAuthHeaders(
    request: HttpRequest<any>
  ): HttpRequest<any> {

    const session = this.storageService.getCurrentSession();

    if (!session?.Token) {
      return request;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.Token}`,
      'Tenant-ID': session.TenantID
    };

    if (session.Cultura) {
      headers['X-Culture'] = session.Cultura;
    }

    return request.clone({ setHeaders: headers });
  }

  private isSubscriptionAccessError(error: HttpErrorResponse): boolean {
    const body = error.error as ApiErrorResponse & { errorCode?: string };
    const errorCode = body?.ErrorCode || body?.errorCode || '';

    return [
      'SUBSCRIPTION_PAYMENT_REQUIRED',
      'SUBSCRIPTION_EXPIRED',
      'SUBSCRIPTION_CANCELLED',
      'SUBSCRIPTION_NOT_ACTIVE'
    ].includes(errorCode);
  }

  private isLicenseAccessError(error: HttpErrorResponse): boolean {
    const body = error.error as ApiErrorResponse & { errorCode?: string };
    const errorCode = body?.ErrorCode || body?.errorCode || '';
    return errorCode.startsWith('LICENSE_');
  }

  private isStationAvailabilityRace(
    error: HttpErrorResponse,
    request: HttpRequest<any>,
  ): boolean {
    const body = error.error as ApiErrorResponse & { errorCode?: string };
    const errorCode = body?.ErrorCode || body?.errorCode || '';
    return request.url.includes('/estacion/dispositivo/asignar-disponible')
      && errorCode === 'ESTACION_DISPONIBLE_NOT_FOUND';
  }

  private isRevokedStationAccess(
    error: HttpErrorResponse,
    request: HttpRequest<any>,
  ): boolean {
    const body = error.error as ApiErrorResponse & { errorCode?: string };
    const errorCode = body?.ErrorCode || body?.errorCode || '';
    const message = body?.Message || body?.message || '';

    return request.url.includes('/trabajos-impresion') && (
      errorCode === 'ESTACION_NOT_FOUND'
      || message.trim().toLowerCase() === 'la estación no existe.'
      || message.trim().toLowerCase() === 'la estacion no existe.'
    );
  }

  private handleRevokedStationAccess(): void {
    if (this.stationRevokedDialogOpen) return;
    this.stationRevokedDialogOpen = true;

    this.spinnerService.hide();
    this.dialog.closeAll();
    this.deviceIdentifier.deleteIdentifier();

    // La sesión se elimina antes de mostrar el aviso. El mensaje ya no puede
    // dejar al usuario operando con una estación que fue reasignada.
    this.storageService.logout();

    void Swal.fire({
      icon: 'warning',
      title: 'Sesión cerrada en este equipo',
      text: 'La estación fue asignada a otro dispositivo. Inicia sesión nuevamente para configurar este equipo.',
      confirmButtonText: 'Ir a iniciar sesión',
      allowEscapeKey: false,
      allowOutsideClick: false,
    }).then(() => {
      window.location.replace(`${window.location.origin}/iniciar-sesion`);
    }).finally(() => {
      this.stationRevokedDialogOpen = false;
    });
  }

  private handleSubscriptionAccessError(error: HttpErrorResponse): void {
    if (this.subscriptionBlockDialogOpen) {
      return;
    }

    this.subscriptionBlockDialogOpen = true;
    const body = error.error as ApiErrorResponse & { errorCode?: string };
    const errorCode = body?.ErrorCode || body?.errorCode || '';
    const title = errorCode === 'SUBSCRIPTION_PAYMENT_REQUIRED'
      ? 'Suscripción pendiente de pago'
      : errorCode === 'SUBSCRIPTION_EXPIRED'
        ? 'Suscripción vencida'
        : errorCode === 'SUBSCRIPTION_CANCELLED'
          ? 'Suscripción cancelada'
          : 'Suscripción no activa';

    this.dialog.closeAll();
    this.clearRememberedTenant();
    this.storageService.logout();

    void Swal.fire({
      icon: 'warning',
      title,
      text: this.getErrorMessage(error),
      confirmButtonText: 'Ir al Portal de Clientes',
      allowEscapeKey: false,
      allowOutsideClick: false
    }).then(() => {
      window.location.assign(environment.customerPortalUrl);
    }).finally(() => {
      this.subscriptionBlockDialogOpen = false;
    });
  }

  private clearRememberedTenant(): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `lc_sucursal=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    document.cookie = `lc_sucursal=; Max-Age=0; Path=/; Domain=.lacomanda.store; SameSite=Lax${secure}`;
  }

  private forceLogout(): void {
    this.spinnerService.hide();
    this.dialog.closeAll();
    this.storageService.logout();
  }

  /**
   * Convierte recursivamente fechas UTC ISO 8601 en Date.
   */
  private convertDates(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Las respuestas binarias (PDF, imÃ¡genes, exportaciones, etc.) no son
    // objetos JSON y deben llegar intactas al consumidor. Recorrer un Blob
    // lo convertÃ­a en {}, provocando que URL.createObjectURL fallara aunque
    // la API hubiera respondido correctamente con 200.
    if (
      value instanceof Blob ||
      value instanceof ArrayBuffer ||
      value instanceof FormData
    ) {
      return value;
    }

    if (typeof value === 'string') {
      return this.UTC_DATE_REGEX.test(value)
        ? new Date(value)
        : value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.convertDates(item));
    }

    if (typeof value === 'object' && !(value instanceof Date)) {
      const result: any = {};

      for (const key of Object.keys(value)) {
        result[key] = this.convertDates(value[key]);
      }

      return result;
    }

    return value;
  }

  /**
   * Evita insertar mensajes del backend directamente como HTML.
   */
  private escapeHtml(value: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#039;'
    };

    return value.replace(
      /[&<>"']/g,
      character => entities[character]
    );
  }
}

export const JobBackendProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: ApiRequestInterceptor,
  multi: true
};
