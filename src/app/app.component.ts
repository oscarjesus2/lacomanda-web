import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
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
import { AgenteImpresionPedidosService } from './services/agente-impresion-pedidos.service';
import { EstacionSessionRealtimeService } from './services/estacion-session-realtime.service';
import { NivelUsuarioEnum } from './enums/enum';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'Jbs_Resta';
  headerVisible = true;
  operationalHeaderOpen = false;
  isOperationalRoute = false;

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
    private agenteImpresionPedidos: AgenteImpresionPedidosService,
    private estacionSessionRealtime: EstacionSessionRealtimeService,
  ) {
    this.backendDown$ = this.backendStatusService.isDown$;
    this.checkForUpdates();
    this.headerService.headerVisible$.subscribe(visible => {
      this.headerVisible = visible;
      if (visible) {
        this.operationalHeaderOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.agenteImpresionPedidos.detener();
    this.estacionSessionRealtime.stop();
    this.storageService.logout();
  }

  async ngOnInit(): Promise<void> {    
     this.estacionSessionRealtime.start();
     const session = this.storageService.getCurrentSession();
     this.textCatalog.setCulture(
       session?.Cultura ?? session?.CulturaTenant,
     );

     this.router.events.pipe(
       filter(event => event instanceof NavigationEnd)
     ).subscribe((event: NavigationEnd) => {
       this.isOperationalRoute = event.urlAfterRedirects.startsWith('/caja')
         || event.urlAfterRedirects.startsWith('/mozo');
       this.operationalHeaderOpen = false;
       const newTitle = this.getTitle(event.urlAfterRedirects);
       this.dataService.updateVariable_TituloHeader(newTitle);
     });
  }

  get canRevealOperationalHeader(): boolean {
    return this.isOperationalRoute
      && !this.headerVisible
      && this.storageService.getCurrentUser()?.IdNivel === NivelUsuarioEnum.Administrador;
  }

  toggleOperationalHeader(): void {
    this.operationalHeaderOpen = !this.operationalHeaderOpen;
  }

  closeOperationalHeader(): void {
    this.operationalHeaderOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeOperationalHeaderWithEscape(): void {
    this.closeOperationalHeader();
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
        return this.textCatalog.get('register');
      case '/mozo':
        return this.textCatalog.get('orderAttendant');
      case '/administracion':
        return this.textCatalog.get('administration');
      case '/iniciar-sesion':
        return this.textCatalog.get('signIn');
      default:
        return this.textCatalog.get('signIn');
    }
  }
}
