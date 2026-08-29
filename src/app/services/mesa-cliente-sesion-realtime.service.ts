import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from 'src/environments/environment';

interface SolicitudMesaResueltaMessage {
  IdSesion?: number;
  idSesion?: number;
}

@Injectable({ providedIn: 'root' })
export class MesaClienteSesionRealtimeService {
  private hub?: signalR.HubConnection;
  private idSesion?: number;
  private token = '';
  private alResolver?: () => void;
  private alReconectar?: () => void;
  private inicio?: Promise<void>;

  constructor(private readonly zone: NgZone) {}

  iniciar(
    idSesion: number,
    token: string,
    alResolver: () => void,
    alReconectar: () => void
  ): void {
    if (idSesion <= 0 || !token) return;

    if (this.idSesion !== idSesion || this.token !== token) {
      void this.detener().then(() => {
        this.configurar(idSesion, token, alResolver, alReconectar);
        this.conectar();
      });
      return;
    }

    this.alResolver = alResolver;
    this.alReconectar = alReconectar;
    this.conectar();
  }

  async detener(): Promise<void> {
    const hub = this.hub;
    this.hub = undefined;
    this.inicio = undefined;
    this.idSesion = undefined;
    this.token = '';
    this.alResolver = undefined;
    this.alReconectar = undefined;

    if (hub && hub.state !== signalR.HubConnectionState.Disconnected) {
      await hub.stop();
    }
  }

  private configurar(
    idSesion: number,
    token: string,
    alResolver: () => void,
    alReconectar: () => void
  ): void {
    this.idSesion = idSesion;
    this.token = token;
    this.alResolver = alResolver;
    this.alReconectar = alReconectar;

    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    const tenantHost = encodeURIComponent(window.location.hostname);
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/solicitudes-mesa?tenantHost=${tenantHost}`)
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('SolicitudMesaClienteResuelta', (raw: SolicitudMesaResueltaMessage) => {
      const sesionResuelta = Number(raw?.IdSesion ?? raw?.idSesion);
      if (sesionResuelta !== this.idSesion) return;
      this.zone.run(() => this.alResolver?.());
    });

    this.hub.onreconnected(() => {
      void this.suscribir().then(() => {
        this.zone.run(() => this.alReconectar?.());
      });
    });
  }

  private conectar(): void {
    if (!this.hub || this.inicio
      || this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    this.inicio = this.hub.start()
      .then(() => this.suscribir())
      .catch(error => {
        console.warn('No se pudo conectar al canal de la mesa.', error);
      })
      .finally(() => this.inicio = undefined);
  }

  private async suscribir(): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected
      || !this.idSesion || !this.token) return;

    await this.hub.invoke('SuscribirSesion', this.idSesion, this.token);
  }
}
