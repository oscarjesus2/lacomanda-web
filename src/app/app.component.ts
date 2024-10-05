import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NgxSpinnerService } from 'ngx-spinner';
import { StorageService } from 'src/app/services/storage.service';
import { LoginService } from './services/auth/login.service';
import { MatDialog } from '@angular/material/dialog';
import { TurnoService } from './services/turno.service';
import { IdleService } from './services/idle.service';
import { DataService } from '../app/services/data.service';
import { QzTrayV224Service } from './services/qz-tray-v224.service';
import { HeaderService } from './services/header.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Jbs_Resta';
  headerVisible = true;
  constructor(
    private qzTrayService: QzTrayV224Service, 
    private spinnerService: NgxSpinnerService,
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private dialogTurno: MatDialog,
    private turnoService: TurnoService,
    private idleService: IdleService,
    private dataService: DataService,
    private headerService: HeaderService) {
    this.headerService.headerVisible$.subscribe(visible => {
      this.headerVisible = visible;
    });
  }

  ngOnDestroy(): void {
    this.storageService.logout();
  }

  async ngOnInit(): Promise<void> {    
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
      case '/caja':
        return 'caja';
      case '/administracion':
        return 'Administración';
      case '/iniciar-sesion':
        return 'Iniciar Sesión';
      default:
        return 'Iniciar Sesión';
    }
  }
}
