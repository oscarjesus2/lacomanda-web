import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StorageService } from 'src/app/services/storage.service';
import { DataService } from '../app/services/data.service';
import { HeaderService } from './services/header.service';
import { SwUpdate } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';  // O puedes usar cualquier otra notificación

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'Jbs_Resta';
  headerVisible = true;
  constructor(private swUpdate: SwUpdate, private snackBar: MatSnackBar,
              private router: Router,
              private storageService: StorageService,
              private dataService: DataService,
              private headerService: HeaderService) {

    this.checkForUpdates();
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

  checkForUpdates() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.available.subscribe(() => {
        const snackBarRef = this.snackBar.open('Nueva versión disponible', 'Actualizar');

        snackBarRef.onAction().subscribe(() => {
          this.updateToLatestVersion();
        });
      });
    }
  }

  updateToLatestVersion() {
    this.swUpdate.activateUpdate().then(() => {
      document.location.reload();  // Recargar la página para cargar la nueva versión
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
