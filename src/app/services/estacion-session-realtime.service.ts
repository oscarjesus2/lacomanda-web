import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { DeviceIdentifierService } from './device-identifier.service';
import { EstacionService } from './estacion.service';
import { StorageService } from './storage.service';

interface EstacionRevocadaMessage {
  estacion?: string;
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class EstacionSessionRealtimeService {
  private hub?: signalR.HubConnection;
  private connectedIdentifier = '';
  private revoking = false;
  private ensuring = false;
  private started = false;
  private listenersActive = false;
  private lastHttpWarningAt = 0;

  private readonly resumeListener = (): void => {
    void this.ensureConnection();
  };

  private readonly visibilityListener = (): void => {
    if (!document.hidden) void this.ensureConnection();
  };

  constructor(
    private readonly storage: StorageService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly estacionService: EstacionService,
    private readonly zone: NgZone,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.addResumeListeners();
    void this.ensureConnection();
  }

  restart(): void {
    void this.stopHub().then(() => this.ensureConnection());
  }

  stop(): void {
    this.started = false;
    this.removeResumeListeners();
    void this.stopHub();
  }

  private async ensureConnection(): Promise<void> {
    if (this.ensuring || this.revoking) return;
    this.ensuring = true;

    try {
      const token = this.storage.getCurrentToken() ?? '';
      const identifier = this.deviceIdentifier.getIdentifier();
      if (!token || !identifier) {
        await this.stopHub();
        return;
      }

      // Esta comprobacion no depende del WebSocket. Los navegadores moviles
      // pueden suspender SignalR al bloquear la pantalla o cambiar de app;
      // al volver, esta consulta garantiza que una reasignacion no se pierda.
      const vinculadaPorHttp = await this.verifyLinkByHttp(identifier);
      if (vinculadaPorHttp === false) {
        await this.handleRevocation({
          mensaje: 'Esta estacion fue vinculada a otro dispositivo. Debes volver a iniciar sesion para configurar este equipo.',
        });
        return;
      }

      if (this.hub && this.connectedIdentifier !== identifier) {
        await this.stopHub();
      }

      if (!this.hub) {
        const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
        this.connectedIdentifier = identifier;
        this.hub = new signalR.HubConnectionBuilder()
          .withUrl(
            `${apiRoot}/hubs/sesiones-estacion?dispositivoId=${encodeURIComponent(identifier)}`,
            { accessTokenFactory: () => this.storage.getCurrentToken() ?? '' },
          )
          .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        this.hub.on('EstacionDispositivoRevocado', (message: EstacionRevocadaMessage) => {
          this.zone.run(() => void this.handleRevocation(message));
        });

        const currentHub = this.hub;
        currentHub.onreconnected(() => {
          this.zone.run(() => void this.verifyLinkByHub(currentHub));
        });
      }

      if (this.hub.state === signalR.HubConnectionState.Disconnected) {
        try {
          await this.hub.start();
        } catch (error) {
          if (this.isAuthenticationError(error)) {
            await this.handleAuthenticationFailure();
          } else {
            console.warn('No se pudo conectar el control de estación en tiempo real.', error);
          }
          return;
        }
      }

      if (this.hub.state === signalR.HubConnectionState.Connected) {
        await this.verifyLinkByHub(this.hub);
      }
    } finally {
      this.ensuring = false;
    }
  }

  private async handleRevocation(message: EstacionRevocadaMessage): Promise<void> {
    if (this.revoking) return;
    this.revoking = true;
    this.deviceIdentifier.deleteIdentifier();
    await this.stopHub();

    // Primero se invalida la sesión local y se navega al acceso. El usuario
    // ya no puede continuar operando mientras el aviso permanece abierto.
    this.storage.logout();

    await Swal.fire({
      title: 'Sesión cerrada en este equipo',
      text: message?.mensaje
        || 'La estacion fue asignada a otro dispositivo. Debes volver a iniciar sesion para configurar este equipo.',
      icon: 'warning',
      confirmButtonText: 'Ir a iniciar sesión',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    this.revoking = false;
  }

  private async handleAuthenticationFailure(): Promise<void> {
    if (this.revoking) return;
    this.revoking = true;
    await this.stopHub();

    // No se borra el identificador: la sesión perdió validez, pero sigue
    // siendo el mismo equipo y su vínculo se comprobará al reingresar.
    this.storage.logout();

    await Swal.fire({
      title: 'Tu sesión ya no es válida',
      text: 'Vuelve a iniciar sesión para comprobar la vinculación de este equipo.',
      icon: 'warning',
      confirmButtonText: 'Ir a iniciar sesión',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    this.revoking = false;
  }

  private isAuthenticationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /\b401\b|unauthorized|invalid_token|signature key/i.test(message);
  }

  private addResumeListeners(): void {
    if (this.listenersActive) return;
    window.addEventListener('online', this.resumeListener);
    window.addEventListener('focus', this.resumeListener);
    window.addEventListener('pageshow', this.resumeListener);
    document.addEventListener('visibilitychange', this.visibilityListener);
    this.listenersActive = true;
  }

  private removeResumeListeners(): void {
    if (!this.listenersActive) return;
    window.removeEventListener('online', this.resumeListener);
    window.removeEventListener('focus', this.resumeListener);
    window.removeEventListener('pageshow', this.resumeListener);
    document.removeEventListener('visibilitychange', this.visibilityListener);
    this.listenersActive = false;
  }

  private async verifyLinkByHttp(identifier: string): Promise<boolean | undefined> {
    try {
      const response = await firstValueFrom(this.estacionService.verifyDeviceLink(identifier));
      return response.Success ? response.Data === true : undefined;
    } catch (error) {
      // Un fallo temporal de red no debe expulsar al usuario. SignalR seguira
      // intentando reconectar y la consulta se repetira al recuperar actividad.
      const now = Date.now();
      if (now - this.lastHttpWarningAt >= 60_000) {
        console.warn('No se pudo comprobar la vinculacion de la estacion por HTTP.', error);
        this.lastHttpWarningAt = now;
      }
      return undefined;
    }
  }

  private async verifyLinkByHub(hub: signalR.HubConnection): Promise<void> {
    if (this.revoking || this.hub !== hub || hub.state !== signalR.HubConnectionState.Connected) return;

    try {
      const vinculada = await hub.invoke<boolean>('VerificarVinculacion');
      if (!vinculada) {
        await this.handleRevocation({
          mensaje: 'Este dispositivo ya no está vinculado a una estación. Debes volver a iniciar sesión para configurar el equipo.',
        });
      }
    } catch (error) {
      console.warn('No se pudo verificar la vinculación de la estación.', error);
    }
  }

  private async stopHub(): Promise<void> {
    const hub = this.hub;
    this.hub = undefined;
    this.connectedIdentifier = '';
    if (hub) {
      try { await hub.stop(); } catch { /* Ya estaba desconectado. */ }
    }
  }
}
