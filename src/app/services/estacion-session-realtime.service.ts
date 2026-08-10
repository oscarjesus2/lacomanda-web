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

  constructor(
    private readonly storage: StorageService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly zone: NgZone,
  ) {}

  start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => void this.ensureConnection(), this.intervalMs);
    void this.ensureConnection();
  }

  restart(): void {
    void this.stopHub().then(() => this.ensureConnection());
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    void this.stopHub();
  }

  private async ensureConnection(): Promise<void> {
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
          `${apiRoot}/hubs/trabajos-impresion?id=${encodeURIComponent(identifier)}`,
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
        console.warn('No se pudo conectar el control de estacion en tiempo real.', error);
      }
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
