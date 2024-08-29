import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ValidationErrorService } from '../services/validation-error.service';
import Swal from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class ApiRequestInterceptor implements HttpInterceptor {
    constructor(
        private storageService: StorageService,
        private router: Router,
        private notificationService: NotificationService,
        private spinnerService: NgxSpinnerService,
        private validationErrorService: ValidationErrorService,
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        if (request.url.includes('/api/Auth/login')) {
            this.storageService.removeCurrentSession();
        } else {
            const currentSession = this.storageService.getCurrentSession();
            if (currentSession && currentSession.Token) {
                request = request.clone({
                    setHeaders: {
                        Authorization: 'Bearer ' + currentSession.Token,
                        'Tenant-ID': currentSession.TenantID
                    }
                });
            }
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorMessage = 'An unexpected error occurred';
                if (error.status === 401 || error.status === 403) {
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
                    // Manejo estandarizado de otros errores
                    errorMessage = this.getErrorMessage(error);
                    this.notificationService.showError(errorMessage);
                    console.error(errorMessage);
                }
                this.spinnerService.hide();
                return throwError(errorMessage);
            })
        );
    }

    private handleUnauthorizedError() {
        console.log('Token inválido o vencido, redirigir al login');
        this.notificationService.showError('Token inválido o vencido, redirigiendo al login');
        this.storageService.removeCurrentSession();
        this.router.navigate(['/iniciar-sesion']);
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
