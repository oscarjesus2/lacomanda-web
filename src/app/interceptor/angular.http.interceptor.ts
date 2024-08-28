import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';
import { NgxSpinnerService } from 'ngx-spinner';
<<<<<<< HEAD
import { ValidationErrorService } from '../services/validation-error.service'; // Importa tu servicio de validaciones
=======
import { ValidationErrorService } from '../services/validation-error.service';
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
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

            // Excluir la URL de impresión del interceptor
        if (request.url.startsWith('https://services.jobbusiness.pe/print')) {
            return next.handle(request); // Deja pasar la solicitud sin modificar
        }
        
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
<<<<<<< HEAD
                } else if (error.status === 400 && error.error && error.error.errors) {
                    // Manejo de errores de validación
                    this.handleValidationErrors(error.error.errors);
                }else {
=======
                } else if (error.status === 400 && error.error) {
                    // Manejo de errores de validación con el nuevo formato
                    if (error.error.errorCode === "VALIDATION_FAILED") {
                        this.handleValidationErrors(error.error.data);
                    } else {
                        errorMessage = this.getErrorMessage(error);
                    }
                } else if (error.status >= 200 && error.status < 300) {
                    return next.handle(request);
                } else {
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
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
<<<<<<< HEAD
                // Extraer el campo y simplificar el mensaje
                const field = this.getFriendlyFieldName(key);
                const messages = errors[key].map(msg => msg.replace(`The ${key} field`, field));
=======
                const field = this.getFriendlyFieldName(key);
                const messages = errors[key].map((msg: string) => msg.replace(`The ${key} field`, field));
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
                validationMessages.push(...messages);
            }
        }
        
<<<<<<< HEAD
        // Mostrar errores en un formato de lista
        
=======
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
        Swal.fire({
            icon: 'error',
            title: 'Errores de Validación',
            html: `<ul style="text-align: left;">${validationMessages.map(msg => `<li>${msg}</li>`).join('')}</ul>`,
            confirmButtonText: 'Cerrar'
        });
    }
    
<<<<<<< HEAD
    // Este método puede ayudar a mapear nombres de campos técnicos a nombres más amigables
=======
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
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
<<<<<<< HEAD
            // Añadir más campos según sea necesario
=======
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
        };
    
        return fieldMap[fieldName] || fieldName;
    }

    private getErrorMessage(error: HttpErrorResponse): string {
        if (error.error && error.error.message) {
            return error.error.message; // Obtener el mensaje directamente desde el ApiResponse
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
}

export let JobBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: ApiRequestInterceptor,
    multi: true
};
