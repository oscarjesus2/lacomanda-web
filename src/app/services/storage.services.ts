import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '../models/session.models';
import { User } from '../models/user.models';
import { LoginService } from './auth/login.service';
import { Turno } from '../models/turno.models';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private localStorageService;
  private currentSession: Session = null;
 
  private currentIp: string = null;

  constructor(private router: Router, 
              private loginService: LoginService,) {

    this.localStorageService = localStorage;
    this.currentSession = this.loadSessionData();
  }


  setCurrentSession(session: Session): void {
    this.currentSession = session;
    this.localStorageService.setItem('currentSession', JSON.stringify(session));
  }

  loadSessionData(): Session {
    var sessionStr = this.localStorageService.getItem('currentSession');
    return (sessionStr) ? <Session>JSON.parse(sessionStr) : null;
  }

 

   getCurrentSession(): Session {
    return this.currentSession;
  }

  getCurrentIP(): string {
    var session: Session = this.getCurrentSession();
    return (session && session.Ip) ? session.Ip : null;
  }
  getCurrentUser(): User {
    var session: Session = this.getCurrentSession();
    return (session && session.user) ? session.user : null;
  };
  getCurrentNombreSucursal(): string {
    var session: Session = this.getCurrentSession();
    return (session && session.nombresucursal) ? session.nombresucursal : null;
  };

  getCurrentToken(): string {
    var session = this.getCurrentSession();
    return (session && session.token) ? session.token : null;
  };


  removeCurrentSession(): void {
    this.localStorageService.removeItem('currentSession');
    this.currentSession = null;
  }

  isAuthenticated(): boolean {
    return (this.getCurrentToken() != null) ? true : false;
  };


  logout(): void {
    this.removeCurrentSession();
    this.router.navigate(['/iniciar-sesion']);
    this.loginService.userLoginOn.emit(false);
    this.loginService.idturnoShare.emit(0);
  }
}
