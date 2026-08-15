import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';

export interface ReservaActualizadaMessage {
  IdReserva: number;
  Codigo: string;
  Estado: string;
  InicioUtc: string;
}

@Injectable({ providedIn: 'root' })
export class ReservasRealtimeService {
  private readonly cambiosSubject = new Subject<ReservaActualizadaMessage>();
  readonly cambios$ = this.cambiosSubject.asObservable();

  private hub?: signalR.HubConnection;
  private iniciando?: Promise<void>;
  private reintento?: ReturnType<typeof setTimeout>;
  private detenerSolicitado = false;

  constructor(
    private readonly storage: StorageService,
    private readonly zone: NgZone
  ) {}

  iniciar(): void {
    this.detenerSolicitado = false;
    if (this.iniciando || this.conexionActiva()) return;
    this.iniciando = this.iniciarInterno().finally(() => this.iniciando = undefined);
  }

  async detener(): Promise<void> {
    this.detenerSolicitado = true;
    if (this.reintento) clearTimeout(this.reintento);
    this.reintento = undefined;
    const hub = this.hub;
    this.hub = undefined;
    if (hub && hub.state !== signalR.HubConnectionState.Disconnected) {
      await hub.stop();
    }
  }

  private async iniciarInterno(): Promise<void> {
    if (!this.storage.getCurrentToken() || this.detenerSolicitado) return;
    if (!this.hub) this.crearHub();
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    try {
      await this.hub.start();
    } catch (error) {
      console.warn('No se pudo conectar al canal de reservas.', error);
      this.programarReconexion();
    }
  }

  private crearHub(): void {
    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/reservas`, {
        accessTokenFactory: () => this.storage.getCurrentToken() ?? ''
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('ReservaActualizada', raw => {
      const cambio: ReservaActualizadaMessage = {
        IdReserva: Number(raw?.IdReserva ?? raw?.idReserva ?? 0),
        Codigo: String(raw?.Codigo ?? raw?.codigo ?? ''),
        Estado: String(raw?.Estado ?? raw?.estado ?? ''),
        InicioUtc: String(raw?.InicioUtc ?? raw?.inicioUtc ?? '')
      };
      this.zone.run(() => this.cambiosSubject.next(cambio));
    });

    this.hub.onreconnected(() => {
      this.zone.run(() => this.cambiosSubject.next({ IdReserva: 0, Codigo: '', Estado: '', InicioUtc: '' }));
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
    if (this.detenerSolicitado || this.reintento) return;
    this.reintento = setTimeout(() => {
      this.reintento = undefined;
      this.iniciar();
    }, 10_000);
  }
}
