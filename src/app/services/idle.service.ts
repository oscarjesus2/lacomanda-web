// src/app/services/idle.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import {jwtDecode}  from 'jwt-decode';
import { StorageService } from './storage.service';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  private timeoutId: any;
  private readonly timeout: number = 1 * 60 * 1000; // 15 minutos

  constructor(private ngZone: NgZone, private router: Router, private storageService:StorageService,  private dialog: MatDialog) {
    this.startWatching();
    this.setupListeners();
  }

  private startWatching(): void {
    this.ngZone.runOutsideAngular(() => {
      this.resetTimeout();
    });
  }

  private setupListeners(): void {
    window.addEventListener('mousemove', () => this.resetTimeout());
    window.addEventListener('scroll', () => this.resetTimeout());
    window.addEventListener('keydown', () => this.resetTimeout());
    window.addEventListener('click', () => this.resetTimeout());
  }

  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.ngZone.run(() => this.checkTokenAndLogout());
    }, this.timeout);
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
    const decodedToken: any = jwtDecode (token);
    const expiryTime = decodedToken.exp * 1000; // convertir a milisegundos
    return Date.now() > expiryTime;
  }

  private logout(): void {
    this.dialog.closeAll();  // Cierra todos los diálogos abiertos
    this.storageService.logout();
    this.router.navigate(['/iniciar-sesion']);
  }
}
