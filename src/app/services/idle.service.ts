								   
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { StorageService } from './storage.service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  private timeoutId: any;
  private warningTimeoutId: any;
  private readonly timeout: number = 1 * 45 * 1000; // 15 minutos
  private readonly warningTime: number = 15 * 1000; // 10 segundos antes de expirar

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private storageService: StorageService
  ) {
    this.startWatching();
    this.setupListeners();
  }

  private mousemoveListener: () => void;
private scrollListener: () => void;
private keydownListener: () => void;
private clickListener: () => void;



  private startWatching(): void {
    this.ngZone.runOutsideAngular(() => {
      this.resetTimeout();
    });
  }

  private setupListeners(): void {
    this.mousemoveListener = () => this.resetTimeout();
    this.scrollListener = () => this.resetTimeout();
    this.keydownListener = () => this.resetTimeout();
    this.clickListener = () => this.resetTimeout();
    
    window.addEventListener('mousemove', () => this.resetTimeout());
    window.addEventListener('scroll', () => this.resetTimeout());
    window.addEventListener('keydown', () => this.resetTimeout());
    window.addEventListener('click', () => this.resetTimeout());	  
  }

  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
    }

    this.warningTimeoutId = setTimeout(() => {
      this.ngZone.run(() => this.showWarning());
    }, this.timeout - this.warningTime);

    // Configurar tiempo de inactividad para cerrar sesión
    this.timeoutId = setTimeout(() => {
      this.ngZone.run(() => this.checkTokenAndLogout());
    }, this.timeout);
  }

  private showWarning(): void {
    Swal.fire({
      title: 'Sesión a punto de expirar',
      text: 'Tu sesión expirará en breve debido a inactividad. ¿Deseas continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'No, cerrar sesión',
	    allowOutsideClick: false,
      allowEscapeKey: false,
      timer: this.warningTime, // Tiempo restante antes de cerrar sesión
      timerProgressBar: true,
    }).then((result) => {

      if (result.isConfirmed) {
        this.resetTimeout(); // Si el usuario confirma, resetea el temporizador
						   
      } else if (result.isDismissed) { 
        this.logout(); // Si el usuario cancela, cerrar sesión
      }
    });
  }

  private checkTokenAndLogout(): void {
    const token = localStorage.getItem('userToken');
    if (token && !this.isTokenExpired(token)) {
      this.resetTimeout();
    } else {
      this.logout();
    }
  }

  private isTokenExpired(token: string): boolean {
    const decodedToken: any = jwtDecode(token);
    const expiryTime = decodedToken.exp * 1000; // convertir a milisegundos
    return Date.now() > expiryTime;
  }

  private logout(): void {
	  Swal.close();
    
  // Limpiar los temporizadores
  if (this.timeoutId) {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
  if (this.warningTimeoutId) {
    clearTimeout(this.warningTimeoutId);
    this.warningTimeoutId = null;
  }

  // Remover los event listeners
  window.removeEventListener('mousemove', this.mousemoveListener);
  window.removeEventListener('scroll', this.scrollListener);
  window.removeEventListener('keydown', this.keydownListener);
  window.removeEventListener('click', this.clickListener);												
    this.storageService.logout();
    this.router.navigate(['/iniciar-sesion']);
  }
}
