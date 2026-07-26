import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { StorageService } from 'src/app/services/storage.service';
import { DataService } from '../app/services/data.service';
import { HeaderService } from './services/header.service';
import { BackendStatusService } from './services/backend-status.service';
import { SwUpdate } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TenantTextCatalogService } from './services/localization/tenant-text-catalog.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'Jbs_Resta';
  headerVisible = true;

  /** true cuando el backend no responde (status 0) */
  backendDown$: Observable<boolean>;

  constructor(
    private swUpdate: SwUpdate,
    private snackBar: MatSnackBar,
    private router: Router,
    private storageService: StorageService,
    private dataService: DataService,
    private headerService: HeaderService,
    private backendStatusService: BackendStatusService,
    private textCatalog: TenantTextCatalogService,
  ) {
    this.backendDown$ = this.backendStatusService.isDown$;
    this.checkForUpdates();
    this.headerService.headerVisible$.subscribe(visible => {
      this.headerVisible = visible;
    });
  }

  ngOnDestroy(): void {
    this.storageService.logout();
  }

  async ngOnInit(): Promise<void> {    
     const session = this.storageService.getCurrentSession();
     this.textCatalog.setCulture(
       session?.Cultura ?? session?.CulturaTenant,
     );

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
      case '/mozo':
        return this.textCatalog.get('orderAttendant');
      case '/administracion':
        return 'Administración';
      case '/iniciar-sesion':
        return 'Iniciar Sesión';
      default:
        return 'Iniciar Sesión';
    }
  }
}
