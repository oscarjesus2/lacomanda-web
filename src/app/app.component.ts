import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NgxSpinnerService } from 'ngx-spinner';
import { StorageService } from 'src/app/services/storage.services';
import { LoginService } from './services/auth/login.service';
import { MatDialog } from '@angular/material/dialog';
import { TurnoService } from '../app/services/turno.services';
import { IdleService } from './services/idle.service';
import { DataService } from '../app/services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Jbs_Resta';

  constructor(
    private spinnerService: NgxSpinnerService,
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private dialogTurno: MatDialog,
    private turnoService: TurnoService,
    private idleService: IdleService,
    private dataService: DataService
  ) {}

  ngOnDestroy(): void {
    this.storageService.logout();
  }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const newTitle = this.getTitle(event.urlAfterRedirects);
      this.dataService.updateVariable_TituloHeader(newTitle);
    });
  }

  getTitle(url: string): string {
    // Aquí puedes establecer lógicas para determinar el título basado en la URL
    switch (url) {
      case '/dashboard':
        return this.storageService.getCurrentNombreSucursal();
      case '/ventas':
        return 'Ventas';
      case '/administracion':
        return 'Administración';
      case '/iniciar-sesion':
        return 'Iniciar Sesión';
      default:
        return 'Iniciar Sesión';
    }
  }
}
