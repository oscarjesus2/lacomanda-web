import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { StorageService } from 'src/app/services/storage.service';
import { DataService } from '../app/services/data.service';
import { HeaderService } from './services/header.service';
import { BackendStatusService } from './services/backend-status.service';
import { TenantTextCatalogService } from './services/localization/tenant-text-catalog.service';
import { AgenteImpresionPedidosService } from './services/agente-impresion-pedidos.service';
import { EstacionSessionRealtimeService } from './services/estacion-session-realtime.service';
import { EstadoImpresion, EstadoImpresionService } from './services/estado-impresion.service';
import { NivelUsuarioEnum } from './enums/enum';
import { AppUpdateService } from './services/app-update.service';

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

  /** Documentos esperando a que la impresora vuelva. */
  documentosEnEspera = 0;

  private mensajeEstadoImpresion: string | null = null;
  private avisoImpresionOculto = false;

  /**
   * Aviso de impresion para la caja; null cuando no hay nada que decir. Una
   * impresora caida manda sobre el resto: es lo unico que el cajero puede
   * resolver ahora mismo, y ademas se arregla solo.
   */
  get avisoImpresion(): string | null {
    if (this.avisoImpresionOculto) return null;

    if (this.documentosEnEspera > 0) {
      const documentos = this.documentosEnEspera === 1
        ? '1 documento'
        : `${this.documentosEnEspera} documentos`;
      return `La impresora no responde. Hay ${documentos} en espera; `
        + 'se imprimirán solos en cuanto vuelva.';
    }

    return this.mensajeEstadoImpresion;
  }

  constructor(
    private appUpdateService: AppUpdateService,
    private router: Router,
    private storageService: StorageService,
    private dataService: DataService,
    private headerService: HeaderService,
    private backendStatusService: BackendStatusService,
    private textCatalog: TenantTextCatalogService,
    private agenteImpresionPedidos: AgenteImpresionPedidosService,
    private estacionSessionRealtime: EstacionSessionRealtimeService,
    private estadoImpresionService: EstadoImpresionService,
  ) {
    this.backendDown$ = this.backendStatusService.isDown$;
    this.headerService.headerVisible$.subscribe(visible => {
      this.headerVisible = visible;
      if (visible) {
        this.operationalHeaderOpen = false;
      }
    });
    this.estadoImpresionService.estado$.subscribe(estado => {
      const mensaje = this.mensajeImpresion(estado);
      if (mensaje !== this.mensajeEstadoImpresion) {
        // Un aviso nuevo vuelve a mostrarse aunque se cerrara el anterior.
        this.avisoImpresionOculto = false;
      }
      this.mensajeEstadoImpresion = mensaje;
    });

    this.estadoImpresionService.pendientes$.subscribe(pendientes => {
      if (pendientes > 0 && this.documentosEnEspera === 0) {
        this.avisoImpresionOculto = false;
      }
      this.documentosEnEspera = pendientes;
    });
  }

  /**
   * Texto del aviso segun por que no se puede imprimir. Un permiso denegado no
   * se recupera solo, asi que ese caso indica donde tiene que ir el usuario.
   */
  private mensajeImpresion(estado: EstadoImpresion): string | null {
    if (estado.disponible) {
      // Se imprime, pero QZ Tray pedira confirmacion en el escritorio en cada
      // ticket hasta que se importe el certificado.
      return estado.certificadoConfigurado === false
        ? 'QZ Tray está rechazando las impresiones de LaComanda porque no tiene '
          + 'autorizado su certificado. Ábrelo en Advanced → Site Manager, '
          + 'importa el certificado y comprueba que el sitio no esté en la lista '
          + 'de bloqueados.'
        : null;
    }

    switch (estado.motivo) {
      case 'permiso-denegado':
        return 'Impresión directa desactivada: este navegador tiene bloqueado el '
          + 'acceso a la red local. Actívalo en el candado de la barra de '
          + 'direcciones → Acceso a la red local → Permitir.';
      case 'permiso-pendiente':
        return 'Impresión directa sin autorizar. Los tickets saldrán por el '
          + 'diálogo del navegador hasta que la actives.';
      default:
        return 'QZ Tray no responde. Los tickets saldrán por el diálogo del '
          + 'navegador hasta que se restablezca.';
    }
  }

  cerrarAvisoImpresion(): void {
    this.avisoImpresionOculto = true;
  }

  ngOnDestroy(): void {
    this.appUpdateService.stop();
    this.agenteImpresionPedidos.detener();
    this.estacionSessionRealtime.stop();
    this.storageService.logout();
  }

  async ngOnInit(): Promise<void> {    
     this.appUpdateService.start();
     this.actualizarRealtimePorRuta(this.router.url);
     const session = this.storageService.getCurrentSession();
     this.textCatalog.setCulture(
       session?.Cultura ?? session?.CulturaTenant,
     );

     this.router.events.pipe(
       filter(event => event instanceof NavigationEnd)
     ).subscribe((event: NavigationEnd) => {
       this.actualizarRealtimePorRuta(event.urlAfterRedirects);
       this.isOperationalRoute = event.urlAfterRedirects.startsWith('/caja')
         || event.urlAfterRedirects.startsWith('/mozo');
       this.operationalHeaderOpen = false;
       const newTitle = this.getTitle(event.urlAfterRedirects);
       this.dataService.updateVariable_TituloHeader(newTitle);
     });
  }

  private actualizarRealtimePorRuta(url: string): void {
    if (this.esRutaPublicaComensal(url)) {
      this.estacionSessionRealtime.stop();
      return;
    }

    this.estacionSessionRealtime.start();
  }

  private esRutaPublicaComensal(url: string): boolean {
    return url.startsWith('/mesa/') || url.startsWith('/reservas');
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
