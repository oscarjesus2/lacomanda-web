import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SolicitudMesaPendiente } from 'src/app/models/mesa-cliente.models';
import { environment } from 'src/environments/environment';
import { MesaClienteService } from './mesa-cliente.service';
import { StorageService } from './storage.service';

interface SolicitudMesaResueltaMessage {
  IdSesion?: number;
  idSesion?: number;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesMesaRealtimeService {
  private readonly solicitudesSubject = new BehaviorSubject<SolicitudMesaPendiente[]>([]);
  readonly solicitudes$ = this.solicitudesSubject.asObservable();

  private hub?: signalR.HubConnection;
  private iniciando?: Promise<void>;
  private reintentoConexion?: ReturnType<typeof setTimeout>;
  private readonly expiraciones = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly mesaClienteService: MesaClienteService,
    private readonly storageService: StorageService,
    private readonly zone: NgZone
  ) {}

  iniciar(): void {
    if (this.iniciando || this.conexionActiva()) return;

    this.iniciando = this.iniciarInterno()
      .finally(() => this.iniciando = undefined);
  }

  private async iniciarInterno(): Promise<void> {
    if (!this.storageService.getCurrentToken()) return;

    if (!this.hub) this.crearHub();
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    try {
      await this.hub.start();
      await this.sincronizarPendientes();
    } catch (error) {
      console.warn('No se pudo conectar al canal de solicitudes de mesa.', error);
      this.programarReconexion();
    }
  }

  private crearHub(): void {
    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/solicitudes-mesa`, {
        accessTokenFactory: () => this.storageService.getCurrentToken() ?? ''
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('SolicitudMesaClienteCreada', raw => {
      this.zone.run(() => this.registrarSolicitud(this.normalizar(raw)));
    });

    this.hub.on('SolicitudMesaClienteResuelta', (raw: SolicitudMesaResueltaMessage) => {
      const idSesion = Number(raw?.IdSesion ?? raw?.idSesion);
      if (idSesion > 0) this.zone.run(() => this.eliminarSolicitud(idSesion));
    });

    this.hub.onreconnected(() => {
      void this.sincronizarPendientes();
    });

    this.hub.onclose(() => this.programarReconexion());
  }

  private conexionActiva(): boolean {
    return !!this.hub && [
      signalR.HubConnectionState.Connected,
      signalR.HubConnectionState.Connecting,
      signalR.HubConnectionState.Reconnecting
    ].includes(this.hub.state);
  }

  private programarReconexion(): void {
    if (this.reintentoConexion) return;
    this.reintentoConexion = setTimeout(() => {
      this.reintentoConexion = undefined;
      this.iniciar();
    }, 10_000);
  }

  private async sincronizarPendientes(): Promise<void> {
    try {
      const response = await firstValueFrom(this.mesaClienteService.listarPendientes());
      this.publicar((response.Data || []).map(item => this.normalizar(item)));
    } catch (error) {
      console.warn('No se pudo recuperar el estado actual de las solicitudes de mesa.', error);
    }
  }

  private registrarSolicitud(solicitud: SolicitudMesaPendiente): void {
    if (!solicitud.IdSesion || solicitud.ExpiraUtc.getTime() <= Date.now()) return;

    const solicitudes = this.solicitudesSubject.value
      .filter(item => item.IdSesion !== solicitud.IdSesion);
    solicitudes.push(solicitud);
    this.publicar(solicitudes);
  }

  private eliminarSolicitud(idSesion: number): void {
    this.publicar(this.solicitudesSubject.value.filter(item => item.IdSesion !== idSesion));
  }

  private publicar(solicitudes: SolicitudMesaPendiente[]): void {
    const vigentes = solicitudes.filter(item => item.ExpiraUtc.getTime() > Date.now());
    this.solicitudesSubject.next(vigentes);
    this.programarExpiraciones(vigentes);
  }

  private programarExpiraciones(solicitudes: SolicitudMesaPendiente[]): void {
    this.expiraciones.forEach(timeout => clearTimeout(timeout));
    this.expiraciones.clear();

    solicitudes.forEach(solicitud => {
      const espera = Math.max(0, solicitud.ExpiraUtc.getTime() - Date.now());
      const timeout = setTimeout(() => {
        this.zone.run(() => this.eliminarSolicitud(solicitud.IdSesion));
      }, espera + 100);
      this.expiraciones.set(solicitud.IdSesion, timeout);
    });
  }

  private normalizar(raw: any): SolicitudMesaPendiente {
    return {
      IdSesion: Number(raw?.IdSesion ?? raw?.idSesion ?? 0),
      IdEspacio: Number(raw?.IdEspacio ?? raw?.idEspacio ?? 0),
      Ambiente: String(raw?.Ambiente ?? raw?.ambiente ?? ''),
      Espacio: String(raw?.Espacio ?? raw?.espacio ?? ''),
      Numero: Number(raw?.Numero ?? raw?.numero ?? 0),
      CodigoVisual: String(raw?.CodigoVisual ?? raw?.codigoVisual ?? ''),
      FechaSolicitudUtc: new Date(raw?.FechaSolicitudUtc ?? raw?.fechaSolicitudUtc),
      ExpiraUtc: new Date(raw?.ExpiraUtc ?? raw?.expiraUtc)
    };
  }
}
