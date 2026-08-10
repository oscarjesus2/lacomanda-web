import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { DeviceIdentifierService } from './device-identifier.service';
import { StorageService } from './storage.service';

interface EstacionRevocadaMessage {
  estacion?: string;
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class EstacionSessionRealtimeService {
  private readonly intervalMs = 15_000;
  private hub?: signalR.HubConnection;
  private interval?: ReturnType<typeof setInterval>;
  private connectedIdentifier = '';
  private revoking = false;
  private ensuring = false;
  private listenersActive = false;

  private readonly resumeListener = (): void => {
    void this.ensureConnection();
  };

  private readonly visibilityListener = (): void => {
    if (!document.hidden) void this.ensureConnection();
  };

  constructor(
    private readonly storage: StorageService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly zone: NgZone,
  ) {}

  start(): void {
    if (this.interval) return;
    this.addResumeListeners();
    this.interval = setInterval(() => void this.ensureConnection(), this.intervalMs);
    void this.ensureConnection();
  }

  restart(): void {
    void this.stopHub().then(() => this.ensureConnection());
  }

  stop(): void {
    this.removeResumeListeners();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
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
        try {
          const vinculada = await this.hub.invoke<boolean>('VerificarVinculacion');
          if (!vinculada) {
            await this.handleRevocation({
              mensaje: 'Este dispositivo ya no está vinculado a una estación. Debes volver a iniciar sesión para configurar el equipo.',
            });
          }
        } catch (error) {
          console.warn('No se pudo verificar la vinculación de la estación.', error);
        }
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
    document.addEventListener('visibilitychange', this.visibilityListener);
    this.listenersActive = true;
  }

  private removeResumeListeners(): void {
    if (!this.listenersActive) return;
    window.removeEventListener('online', this.resumeListener);
    document.removeEventListener('visibilitychange', this.visibilityListener);
    this.listenersActive = false;
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
