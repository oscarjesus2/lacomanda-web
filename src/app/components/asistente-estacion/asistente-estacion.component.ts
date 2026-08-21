import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { EstacionTipoEnum, NivelUsuarioEnum } from '../../enums/enum';
import { Estacion } from '../../models/estacion.models';
import { DeviceIdentifierService } from '../../services/device-identifier.service';
import { EstacionSessionRealtimeService } from '../../services/estacion-session-realtime.service';
import { EstacionService } from '../../services/estacion.service';
import {
  TenantTextCatalogService,
  TenantTextKey,
  TenantTextParams,
} from '../../services/localization/tenant-text-catalog.service';
import { StorageService } from '../../services/storage.service';
import { CARACTERISTICAS_LICENCIA } from '../../constants/caracteristicas-licencia';
import { LicenciaTenantService } from '../../services/licencia-tenant.service';

@Component({
  selector: 'app-asistente-estacion',
  templateUrl: './asistente-estacion.component.html',
  styleUrls: ['./asistente-estacion.component.css'],
})
export class AsistenteEstacionComponent implements OnInit, OnDestroy {
  visible = false;
  expanded = false;
  loading = false;
  assigning = false;
  readyMessage = '';
  feedbackMessage = '';

  private availableStations: Estacion[] = [];
  private onEligibleRoute = false;
  private operationEnabled = false;
  private readonly subscriptions = new Subscription();
  private navigationTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly router: Router,
    private readonly storage: StorageService,
    private readonly stationService: EstacionService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly stationRealtime: EstacionSessionRealtimeService,
    private readonly textCatalog: TenantTextCatalogService,
    private readonly licenseService: LicenciaTenantService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      ).subscribe(event => this.handleRoute(event.urlAfterRedirects)),
    );

    this.subscriptions.add(
      this.licenseService
        .tieneCaracteristica(CARACTERISTICAS_LICENCIA.OperacionCaja)
        .subscribe(enabled => {
          this.operationEnabled = enabled;
          this.handleRoute(this.router.url);
        }),
    );

    this.handleRoute(this.router.url);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.navigationTimer) clearTimeout(this.navigationTimer);
  }

  get hasRegisterAvailable(): boolean {
    return this.availableStations.some(
      station => station.Tipo === EstacionTipoEnum.CAJA,
    );
  }

  get hasAttendantAvailable(): boolean {
    return this.availableStations.some(
      station => station.Tipo === EstacionTipoEnum.MOZO,
    );
  }

  get availableOptionsText(): string {
    const options: string[] = [];
    if (this.hasRegisterAvailable) {
      options.push(this.t('stationAssistantRegisterOption'));
    }
    if (this.hasAttendantAvailable) {
      options.push(this.t('stationAssistantAttendantOption', {
        attendant: this.t('orderAttendant'),
      }));
    }
    return options.join(' / ');
  }

  t(key: TenantTextKey, params?: TenantTextParams): string {
    return this.textCatalog.get(key, params);
  }

  openOptions(): void {
    this.feedbackMessage = '';
    this.expanded = true;
  }

  remindLater(): void {
    sessionStorage.setItem(this.preferenceKey('later'), 'true');
    this.visible = false;
  }

  neverShowAgain(): void {
    localStorage.setItem(this.preferenceKey('dismissed'), 'true');
    this.visible = false;
  }

  assign(tipo: EstacionTipoEnum): void {
    if (this.assigning || !this.isTypeAvailable(tipo)) return;

    this.assigning = true;
    this.feedbackMessage = '';
    const identifier = this.deviceIdentifier.getIdentifier()
      || this.deviceIdentifier.generateIdentifier();

    this.stationService.assignAvailableDevice(tipo, identifier).subscribe({
      next: response => {
        const station = response?.Data;
        if (!response?.Success || !station) {
          this.assigning = false;
          this.feedbackMessage = this.t('stationAssistantError');
          return;
        }

        this.deviceIdentifier.saveIdentifier(identifier);
        const session = this.storage.getCurrentSession();
        if (session) {
          session.Ip = identifier;
          session.User.TipoCompu = station.Tipo;
          this.storage.setCurrentSession(session);
        }

        this.stationRealtime.restart();
        this.availableStations = [];
        this.expanded = false;
        this.assigning = false;
        this.readyMessage = this.t('stationAssistantReady', {
          station: station.Descripcion,
        });

        const target = station.Tipo === EstacionTipoEnum.CAJA ? '/caja' : '/mozo';
        this.navigationTimer = setTimeout(() => {
          this.visible = false;
          void this.router.navigateByUrl(target);
        }, 1100);
      },
      error: error => {
        this.assigning = false;
        const errorCode = error?.error?.ErrorCode ?? error?.error?.errorCode;
        if (errorCode === 'ESTACION_DISPONIBLE_NOT_FOUND') {
          this.feedbackMessage = this.t('stationAssistantTaken');
          this.loadAvailableStations(true);
          return;
        }

        this.feedbackMessage = this.t('stationAssistantError');
      },
    });
  }

  private handleRoute(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    // Los planes básicos no tienen dashboard analítico y aterrizan directamente
    // en Administración. El asistente debe seguir permitiendo vincular este
    // equipo a una estación disponible desde esa pantalla.
    this.onEligibleRoute = path === '/dashboard' || path === '/administracion';
    if (!this.onEligibleRoute || !this.operationEnabled) {
      this.visible = false;
      return;
    }

    if (!this.isEligible()) {
      this.visible = false;
      return;
    }

    this.loadAvailableStations();
  }

  private isEligible(): boolean {
    const session = this.storage.getCurrentSession();
    if (!session?.Token || session.User?.IdNivel !== NivelUsuarioEnum.Administrador) {
      return false;
    }

    if (session.User.TipoCompu === EstacionTipoEnum.CAJA
      || session.User.TipoCompu === EstacionTipoEnum.MOZO) {
      return false;
    }

    return localStorage.getItem(this.preferenceKey('dismissed')) !== 'true'
      && sessionStorage.getItem(this.preferenceKey('later')) !== 'true';
  }

  private loadAvailableStations(preserveFeedback = false): void {
    if (this.loading) return;
    this.loading = true;
    if (!preserveFeedback) this.feedbackMessage = '';

    const identifier = this.deviceIdentifier.getIdentifier();
    if (identifier) {
      this.stationService.verifyDeviceLink(identifier).subscribe({
        next: response => {
          if (response?.Success && response.Data === true) {
            this.loading = false;
            this.availableStations = [];
            this.visible = false;
            this.expanded = false;
            return;
          }

          this.requestAvailableStations();
        },
        error: () => this.requestAvailableStations(),
      });
      return;
    }

    this.requestAvailableStations();
  }

  private requestAvailableStations(): void {
    this.stationService.getAvailableForDevice().subscribe({
      next: response => {
        this.loading = false;
        this.availableStations = (response?.Data ?? []).filter(station =>
          station.Tipo === EstacionTipoEnum.CAJA
          || station.Tipo === EstacionTipoEnum.MOZO,
        );
        this.visible = this.onEligibleRoute
          && this.operationEnabled
          && this.isEligible()
          && this.availableStations.length > 0;
        if (!this.visible) this.expanded = false;
      },
      error: () => {
        this.loading = false;
        this.availableStations = [];
        this.visible = false;
      },
    });
  }

  private isTypeAvailable(tipo: EstacionTipoEnum): boolean {
    return this.availableStations.some(station => station.Tipo === tipo);
  }

  private preferenceKey(preference: 'later' | 'dismissed'): string {
    const tenantId = this.storage.getCurrentSession()?.TenantID ?? 'tenant';
    return `lacomanda:station-assistant:${preference}:${tenantId}`;
  }
}
