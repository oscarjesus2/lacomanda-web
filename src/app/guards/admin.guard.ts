import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { StorageService } from '../services/storage.services';
import {jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard  {

  constructor(private router: Router, private storageService: StorageService) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    
    if (this.storageService.isAuthenticated() && !this.isTokenExpired(this.storageService.getCurrentToken())) {
      return true;
    }

    return this.router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: state.url } });
    
  }

  private isTokenExpired(token: string): boolean {
    const decodedToken: any = jwtDecode (token);
    const expiryTime = decodedToken.exp * 1000; // convertir a milisegundos
    return Date.now() > expiryTime;
  }
}
