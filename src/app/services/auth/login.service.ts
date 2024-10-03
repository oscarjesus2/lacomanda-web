import { EventEmitter, Injectable, Output } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { LoginRequest } from './loginRequest';
import { BehaviorSubject, Observable, catchError, throwError, tap } from 'rxjs';
import { Usuario } from 'src/app/models/usuario.models';
import { Turno } from 'src/app/models/turno.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
 
  private basePath = environment.apiUrl + '/Auth/login';
  constructor(private http: HttpClient) {}
    
  login(usuario:LoginRequest, tenantID: string): Observable<Usuario>{
    // Configura los encabezados
    const headers = new HttpHeaders({
      'Tenant-ID': tenantID  
    });

    return this.http.post<Usuario>(this.basePath, usuario, { headers }).pipe(
      tap((userData: Usuario) =>{
      }),
      catchError(this.handleError)
    );
  }

  simpleLogin(username: string, password: string): Observable<Usuario> {
    return this.http.get<Usuario>(this.basePath + username + '/' + password);
  }
  
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      console.error('Error del lado del cliente:', error.error.message);
    } else {
      // El servidor retornó un código de error
      console.error(
        `Código de error ${error.status}, ` +
        `contenido: ${JSON.stringify(error.error)}`
      );
      // Aquí podrías guardar error.error en algún servicio o hacer algo con esa información
      // Por ejemplo, si tienes un servicio de registro de errores:
      // this.errorLoggingService.logError(error.error);
    }
    // Retornar un mensaje de error observable con detalles para el usuario
    return throwError(() => new Error('Algo falló. Por favor, inténtelo nuevamente.'));
  }
   
 
}
