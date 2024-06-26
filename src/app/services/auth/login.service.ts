import { EventEmitter, Injectable, Output } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { LoginRequest } from './loginRequest';
import { BehaviorSubject, Observable, catchError, throwError, tap } from 'rxjs';
import { User } from 'src/app/models/user.models';
import { Turno } from 'src/app/models/turno.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
 userLoginOn: EventEmitter<boolean>= new EventEmitter<boolean>();
 idturnoShare: EventEmitter<number>= new EventEmitter<number>();
 nroturnoShare: EventEmitter<number>= new EventEmitter<number>();
 turnoOpenShare: EventEmitter<boolean>= new EventEmitter<boolean>();
 UsuarioShare: EventEmitter<string>= new EventEmitter<string>();
 
  private basePath = environment.apiUrl + '/login/authenticate';
  constructor(private http: HttpClient) {}
    
  login(loginObj:LoginRequest): Observable<User>{
    console.log(this.basePath);
    return this.http.post<User>(this.basePath, loginObj).pipe(
      tap((userData: User) =>{
        // this.currentUserData.next(userData);
        // this.currentUserLoginOn.next(true);
      }),
      catchError(this.handleError)
    );
  }

  simpleLogin(username: string, password: string): Observable<User> {
    return this.http.get<User>(this.basePath + username + '/' + password);
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
