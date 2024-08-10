import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';

@Injectable({
    providedIn: 'root'
})
export class ApiRequestInterceptor implements HttpInterceptor {
    notificationService: any;

    constructor(
        private storageService: StorageService,
        private router: Router
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
                    console.log('Token inválido o vencido, redirigir al login');
                    this.notificationService.showError('Token inválido o vencido, redirigiendo al login');
                    this.storageService.removeCurrentSession();
                    this.router.navigate(['/iniciar-sesion']);
                } else {
                    // Manejo estandarizado de otros errores
                    errorMessage = this.getErrorMessage(error);
                    this.notificationService.showError(errorMessage); // Muestra la notificación de error
                    console.error(errorMessage);
                }
                return throwError(errorMessage);
            })
        );
    }
    private getErrorMessage(error: HttpErrorResponse): string {
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