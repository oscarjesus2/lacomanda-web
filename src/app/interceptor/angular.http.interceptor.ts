import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.services';

@Injectable({
    providedIn: 'root'
})
export class ApiRequestInterceptor implements HttpInterceptor {

    constructor(
        private storageService: StorageService,
        private router: Router
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        if (request.url.includes('/api/login/authenticate')) {
            this.storageService.removeCurrentSession();
        } else {
            const currentSession = this.storageService.getCurrentSession();
            if (currentSession && currentSession.token) {
                request = request.clone({
                    setHeaders: {
                        Authorization: currentSession.token,
                        Sucursal: currentSession.sucursal
                    }
                });
            }
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401 || error.status === 403) {
                    console.log('Token inválido o vencido, redirigir al login');
                    this.storageService.removeCurrentSession();
                    this.router.navigate(['/iniciar-sesion']);
                }
                return throwError(error);
            })
        );
    }
}

export let JobBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: ApiRequestInterceptor,
    multi: true
};
