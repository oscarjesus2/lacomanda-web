import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class PreparacionRealtimeService {
  private readonly cambiosSubject = new Subject<void>();
  readonly cambios$ = this.cambiosSubject.asObservable();
  private hub?: signalR.HubConnection;
  private activo = false;
  private reintento?: ReturnType<typeof setTimeout>;

  private readonly alVolver = (): void => {
    if (!this.activo || document.hidden) return;
    this.publicarCambio();
    void this.conectar();
  };

  constructor(private readonly storage: StorageService, private readonly zone: NgZone) {}

  iniciar(): void {
    if (this.activo) return;
    this.activo = true;
    window.addEventListener('focus', this.alVolver);
    document.addEventListener('visibilitychange', this.alVolver);
    void this.conectar();
  }

  detener(): void {
    this.activo = false;
    window.removeEventListener('focus', this.alVolver);
    document.removeEventListener('visibilitychange', this.alVolver);
    if (this.reintento) clearTimeout(this.reintento);
    this.reintento = undefined;
    const hub = this.hub;
    this.hub = undefined;
    if (hub) void hub.stop().catch(() => undefined);
  }

  private crearHub(): signalR.HubConnection {
    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/preparacion`, {
        accessTokenFactory: () => this.storage.getCurrentToken() ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hub.on('PreparacionActualizada', () => {
      if (this.hub === hub) this.publicarCambio();
    });
    hub.onreconnected(() => {
      if (this.hub === hub) this.publicarCambio();
    });
    hub.onclose(() => {
      if (this.hub === hub) this.programarReconexion();
    });
    return hub;
  }

  private async conectar(): Promise<void> {
    if (!this.activo || !this.storage.getCurrentToken()) return;
    const hub = this.hub ?? (this.hub = this.crearHub());
    if (hub.state !== signalR.HubConnectionState.Disconnected) return;
    try {
      await hub.start();
      // Recupera cambios ocurridos entre la carga inicial y la conexión al hub.
      if (this.hub === hub) this.publicarCambio();
    } catch (error) {
      if (this.hub !== hub || !this.activo) return;
      console.warn('No se pudo conectar al canal de preparación.', error);
      this.programarReconexion();
    }
  }

  private publicarCambio(): void {
    if (this.activo) this.zone.run(() => this.cambiosSubject.next());
  }

  private programarReconexion(): void {
    if (!this.activo || this.reintento) return;
    // Solo reintenta abrir SignalR; no consulta periódicamente las comandas.
    this.reintento = setTimeout(() => {
      this.reintento = undefined;
      void this.conectar();
    }, 30_000);
  }
}
