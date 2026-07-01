import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { StorageService } from '../services/storage.service';
import { KeycloakAuthService } from '../services/auth/keycloak-auth.service';
import { NotificationService } from '../services/notification.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ValidationErrorService } from '../services/validation-error.service';
import Swal from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class ApiRequestInterceptor implements HttpInterceptor {

    /** Evita múltiples refresh simultáneos — sólo el primer 401 dispara el refresh. */
    private isRefreshing = false;
    private refreshDone$ = new BehaviorSubject<string | null>(null);

    constructor(
        private storageService: StorageService,
        private keycloakAuth: KeycloakAuthService,
        private router: Router,
        private dialog: MatDialog,
        private notificationService: NotificationService,
        private spinnerService: NgxSpinnerService,
        private validationErrorService: ValidationErrorService,
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        // Excluir endpoints de autenticación: Keycloak token y el legacy /api/Auth/login
        const isAuthEndpoint = request.url.includes('/protocol/openid-connect/token')
                            || request.url.includes('/api/Auth/login');

        if (!isAuthEndpoint) {
            request = this.addAuthHeaders(request);
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // Endpoints de auth (Keycloak token/logout): no mostrar notificaciones —
                // el LoginComponent maneja el error con su propio subscriber.
                if (isAuthEndpoint) {
                    this.spinnerService.hide();
                    return throwError(() => error);
                }

                if (error.status === 401) {
                    return this.handle401(request, next);
                }

                let errorMessage = 'An unexpected error occurred';
                if (error.status === 403) {
                    this.handleUnauthorizedError();
                } else if (error.status === 400 && error.error) {
                    if (this.isModelValidationError(error)) {
                        this.handleValidationErrors(error.error.errors);
                    } else if (this.isCustomErrorFormat(error)) {
                        errorMessage = this.getErrorMessage(error);
                        this.notificationService.showWarning(errorMessage);
                    }
                } else if (error.status >= 200 && error.status < 300) {
                    return next.handle(request);
                } else {
                    errorMessage = this.getErrorMessage(error);
                    this.notificationService.showError(errorMessage);
                    console.error(errorMessage);
                }
                this.spinnerService.hide();
                return throwError(() => new Error(errorMessage));
            })
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private addAuthHeaders(request: HttpRequest<any>): HttpRequest<any> {
        const session = this.storageService.getCurrentSession();
        if (session?.Token) {
            return request.clone({
                setHeaders: {
                    Authorization: 'Bearer ' + session.Token,
                    'Tenant-ID':   session.TenantID,
                }
            });
        }
        return request;
    }

    /**
     * Maneja un 401:
     * - Si no hay refresh en curso → inicia uno, actualiza la sesión, reintenta.
     * - Si ya hay refresh en curso → espera a que termine y reintenta con el nuevo token.
     * - Si el refresh falla → logout.
     */
    private handle401(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const refreshToken = this.storageService.getRefreshToken();

        if (!refreshToken) {
            this.forceLogout();
            return throwError(() => new Error('No refresh token — sesión expirada'));
        }

        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshDone$.next(null);

            // El realm = TenantID de la sesión (un realm por tenant)
            const realm = this.storageService.getCurrentSession()?.TenantID ?? '';

            return this.keycloakAuth.refresh(refreshToken, realm).pipe(
                switchMap((resp) => {
                    this.isRefreshing = false;
                    this.storageService.updateToken(resp.access_token, resp.refresh_token);
                    this.refreshDone$.next(resp.access_token);
                    return next.handle(this.addAuthHeaders(request));
                }),
                catchError((err) => {
                    this.isRefreshing = false;
                    this.forceLogout();
                    return throwError(() => err);
                })
            );
        }

        // Otro hilo ya está refrescando — esperar el resultado
        return this.refreshDone$.pipe(
            filter((token): token is string => token !== null),
            take(1),
            switchMap(() => next.handle(this.addAuthHeaders(request)))
        );
    }

    private forceLogout(): void {
        this.spinnerService.hide();
        this.dialog.closeAll();       // cierra cualquier dialog abierto antes de navegar
        this.storageService.logout();
    }

    private handleUnauthorizedError() {
        console.log('Acceso denegado (403)');
        this.notificationService.showError('No tiene permisos para realizar esta acción');
    }

    private handleValidationErrors(errors: any) {
        let validationMessages = [];
        
        for (const key in errors) {
            if (errors.hasOwnProperty(key)) {
                const field = this.getFriendlyFieldName(key);
                const messages = errors[key].map((msg: string) => msg.replace(`The ${key} field`, field));
                validationMessages.push(...messages);
            }
        }
        
        // Mostrar errores en un formato de lista
        
        Swal.fire({
            icon: 'error',
            title: 'Errores de Validación',
            html: `<ul style="text-align: left;">${validationMessages.map(msg => `<li>${msg}</li>`).join('')}</ul>`,
            confirmButtonText: 'Cerrar'
        });
    }
    
    private getFriendlyFieldName(fieldName: string): string {
        const fieldMap = {
            'IdCaja': 'ID de la Caja',
            'Moneda': 'Moneda',
            'Cliente': 'Cliente',
            'Direccion': 'Dirección',
            'Referencia': 'Referencia',
            'Observacion': 'Observación',
            'IdTipoPedido': 'Tipo de Pedido',
            'ListaPedidoDet[0].NroCupon': 'Número de Cupón',
            'ListaPedidoDet[0].NombreCuenta': 'Nombre de la Cuenta',
            'ListaPedidoDet[0].MotivoReimpresion': 'Motivo de Reimpresión'
        };
    
        return fieldMap[fieldName] || fieldName;
    }

    private getErrorMessage(error: HttpErrorResponse): string {
        if (this.isCustomErrorFormat(error)) {
            return error.error.Message || 'An unexpected error occurred'; // Obtener el mensaje directamente desde el ApiResponse
        }

        
        switch (error.status) {
            case 404:
                return `Not Found: ${error.message}`;
            case 400:
                return `Bad Request: ${error.message}`;
            case 500:
                return `Internal Server Error: ${error.message}`;
            default:
                return `Unexpected Error: ${error.message}`;
        }
    }

    // Método para verificar si es un error de validación de modelo
    private isModelValidationError(error: HttpErrorResponse): boolean {
        return error.error && error.error.errors && error.error.title === 'One or more validation errors occurred.';
    }

    // Método para verificar si es un error en formato personalizado
    private isCustomErrorFormat(error: HttpErrorResponse): boolean {
        return error.error && error.error.ErrorCode && error.error.Message;
    }
}

export let JobBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: ApiRequestInterceptor,
    multi: true
};
