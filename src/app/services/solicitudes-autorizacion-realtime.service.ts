import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NivelUsuarioEnum } from '../enums/enum';
import {
  SolicitudAutorizacion,
  normalizarSolicitudAutorizacion,
} from '../models/solicitud-autorizacion.models';
import { SolicitudAutorizacionService } from './solicitud-autorizacion.service';
import { StorageService } from './storage.service';
import { UsuarioService } from './usuario.service';

/**
 * Canal en tiempo real de solicitudes de autorización.
 *
 * La base de datos es la fuente de verdad: al conectar y al reconectar se
 * vuelve a cargar la bandeja. SignalR solo avisa de altas y resoluciones.
 */
@Injectable({ providedIn: 'root' })
export class SolicitudesAutorizacionRealtimeService {
  private readonly pendientesSubject = new BehaviorSubject<SolicitudAutorizacion[]>([]);
  /** Bandeja del aprobador (vacía para quien no puede aprobar). */
  readonly pendientes$ = this.pendientesSubject.asObservable();

  private readonly esAprobadorSubject = new BehaviorSubject<boolean>(false);
  readonly esAprobador$ = this.esAprobadorSubject.asObservable();

  private readonly apruebaDescuentosSubject = new BehaviorSubject<boolean>(false);
  /** Los descuentos y las entradas gratis solo los aprueba quien puede aplicarlos. */
  readonly apruebaDescuentos$ = this.apruebaDescuentosSubject.asObservable();

  private readonly creadaSubject = new Subject<SolicitudAutorizacion>();
  /** Nuevas solicitudes (solo llegan a aprobadores). */
  readonly creada$ = this.creadaSubject.asObservable();

  private readonly resueltaSubject = new Subject<SolicitudAutorizacion>();
  /** Resoluciones: llegan a los aprobadores y a quien hizo la solicitud. */
  readonly resuelta$ = this.resueltaSubject.asObservable();

  private hub?: signalR.HubConnection;
  private iniciando?: Promise<void>;
  private reintento?: ReturnType<typeof setTimeout>;
  private detenerSolicitado = false;
  private bandejaInicializada = false;

  constructor(
    private readonly storage: StorageService,
    private readonly api: SolicitudAutorizacionService,
    private readonly usuarioService: UsuarioService,
    private readonly zone: NgZone,
  ) {}

  get esAprobador(): boolean {
    return this.esAprobadorSubject.value;
  }

  get apruebaDescuentos(): boolean {
    return this.apruebaDescuentosSubject.value;
  }

  get pendientes(): SolicitudAutorizacion[] {
    return this.pendientesSubject.value;
  }

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
    this.esAprobadorSubject.next(false);
    this.apruebaDescuentosSubject.next(false);
    this.pendientesSubject.next([]);
    this.bandejaInicializada = false;
    if (hub && hub.state !== signalR.HubConnectionState.Disconnected) {
      await hub.stop();
    }
  }

  /** Vuelve a leer permiso y bandeja (p. ej. tras resolver con error). */
  async sincronizar(): Promise<void> {
    await this.cargarPermiso();
    if (!this.esAprobador) {
      this.pendientesSubject.next([]);
      return;
    }

    try {
      const idsConocidos = new Set(
        this.pendientesSubject.value.map(item => item.IdSolicitud),
      );
      const pendientes = await firstValueFrom(this.api.listarPendientes());
      this.pendientesSubject.next(this.ordenar(pendientes));
      if (this.bandejaInicializada) {
        pendientes
          .filter(item => !idsConocidos.has(item.IdSolicitud))
          .forEach(item => this.creadaSubject.next(item));
      }
      this.bandejaInicializada = true;
    } catch (error) {
      console.warn('No se pudo recuperar la bandeja de solicitudes de autorización.', error);
    }
  }

  /** Quita de la bandeja una solicitud que este equipo acaba de resolver. */
  quitar(idSolicitud: number): void {
    this.pendientesSubject.next(
      this.pendientesSubject.value.filter(s => s.IdSolicitud !== idSolicitud),
    );
  }

  private async iniciarInterno(): Promise<void> {
    if (!this.storage.getCurrentToken() || this.detenerSolicitado) return;
    if (!this.hub) this.crearHub();
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    try {
      await this.hub.start();
      await this.sincronizar();
    } catch (error) {
      console.warn('No se pudo conectar al canal de solicitudes de autorización.', error);
      this.programarReconexion();
    }
  }

  private async cargarPermiso(): Promise<void> {
    try {
      const response = await firstValueFrom(this.usuarioService.getUsuarioActual());
      const usuario = response?.Data;
      const esAdministrador = usuario?.IdNivel === NivelUsuarioEnum.Administrador;
      const esAprobador = !!usuario?.Activo && (
        esAdministrador
        || (usuario.IdNivel === NivelUsuarioEnum.Cajero && !!usuario.PuedeAprobarSolicitudes)
      );
      this.esAprobadorSubject.next(esAprobador);
      this.apruebaDescuentosSubject.next(
        esAprobador && (esAdministrador || !!usuario?.PuedeAplicarDescuento),
      );
    } catch {
      this.esAprobadorSubject.next(false);
      this.apruebaDescuentosSubject.next(false);
    }
  }

  private crearHub(): void {
    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/solicitudes-autorizacion`, {
        accessTokenFactory: () => this.storage.getCurrentToken() ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('SolicitudAutorizacionCreada', raw => {
      const solicitud = normalizarSolicitudAutorizacion(raw);
      this.zone.run(() => {
        if (this.esAprobador) {
          const resto = this.pendientesSubject.value.filter(s => s.IdSolicitud !== solicitud.IdSolicitud);
          this.pendientesSubject.next(this.ordenar([...resto, solicitud]));
        }
        this.creadaSubject.next(solicitud);
      });
    });

    this.hub.on('SolicitudAutorizacionResuelta', raw => {
      const solicitud = normalizarSolicitudAutorizacion(raw);
      this.zone.run(() => {
        this.quitar(solicitud.IdSolicitud);
        this.resueltaSubject.next(solicitud);
      });
    });

    this.hub.onreconnected(() => {
      void this.zone.run(() => this.sincronizar());
    });

    this.hub.onclose(() => {
      if (!this.detenerSolicitado) this.programarReconexion();
    });
  }

  private conexionActiva(): boolean {
    return !!this.hub && [
      signalR.HubConnectionState.Connected,
      signalR.HubConnectionState.Connecting,
      signalR.HubConnectionState.Reconnecting,
    ].includes(this.hub.state);
  }

  private programarReconexion(): void {
    if (this.reintento || this.detenerSolicitado) return;
    this.reintento = setTimeout(() => {
      this.reintento = undefined;
      this.iniciar();
    }, 10_000);
  }

  private ordenar(solicitudes: SolicitudAutorizacion[]): SolicitudAutorizacion[] {
    return [...solicitudes].sort(
      (a, b) => a.FechaSolicitudUtc.getTime() - b.FechaSolicitudUtc.getTime(),
    );
  }
}
