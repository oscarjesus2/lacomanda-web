import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { DeviceIdentifierService } from './device-identifier.service';
import { StorageService } from './storage.service';
import { Session } from '../models/session.models';

interface SesionCerradaMessage {
  mensaje?: string;
}

/**
 * Una persona opera en un equipo a la vez. Al entrar, este equipo pasa a ser
 * la sesión válida; el anterior recibe el aviso y vuelve al acceso (y, si se
 * perdió el aviso, su siguiente petición responde 401).
 */
@Injectable({ providedIn: 'root' })
export class SesionUsuarioService {
  private hub?: signalR.HubConnection;
  private sesionRegistrada?: Session;
  private registroPendiente?: Promise<void>;
  private cerrando = false;

  constructor(
    private readonly http: HttpClient,
    private readonly storage: StorageService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly zone: NgZone,
  ) {}

  /** Escucha el cierre; el registro ocurre al completar el login. */
  iniciar(): void {
    if (this.storage.getCurrentToken()) void this.conectar();
  }

  async detener(): Promise<void> {
    const hub = this.hub;
    this.hub = undefined;
    if (hub && hub.state !== signalR.HubConnectionState.Disconnected) {
      await hub.stop();
    }
  }

  /** Libera la sesión en el servidor al salir (no bloquea la navegación). */
  liberar(): void {
    if (!this.storage.getCurrentToken()) return;

    this.http.delete(`${environment.apiUrl}/usuario/me/sesion`).subscribe({
      error: () => { /* al reingresar se reemplaza igualmente */ },
    });
    void this.detener();
  }

  /** Completa el registro antes de que el login consulte otros endpoints protegidos. */
  async registrarAhora(): Promise<void> {
    const session = this.storage.getCurrentSession();
    if (!session?.Token) return;
    if (this.sesionRegistrada === session) {
      await this.conectar();
      return;
    }

    if (this.registroPendiente) return this.registroPendiente;

    this.registroPendiente = this.registrar(session);
    try {
      await this.registroPendiente;
    } finally {
      this.registroPendiente = undefined;
    }
  }

  private async registrar(session: Session): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/usuario/me/sesion`, {
        IdentificadorEstacion: this.deviceIdentifier.getIdentifier() || null,
      }),
    );
    if (this.storage.getCurrentSession() !== session) return;

    this.sesionRegistrada = session;

    // Quien acaba de entrar sabe que ha entrado: el aviso es para el equipo
    // que queda desplazado, y le llega por el hub.
    await this.conectar();
  }

  private async conectar(): Promise<void> {
    if (this.hub) return;

    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/sesion-usuario`, {
        accessTokenFactory: () => this.storage.getCurrentToken() ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('SesionCerradaEnOtroEquipo', (message: SesionCerradaMessage) => {
      this.zone.run(() => void this.cerrarPorOtroEquipo(message));
    });

    try {
      await this.hub.start();
    } catch {
      this.hub = undefined;
    }
  }

  private async cerrarPorOtroEquipo(message: SesionCerradaMessage): Promise<void> {
    if (this.cerrando) return;
    this.cerrando = true;

    await this.detener();
    // Primero se invalida la sesión local: no puede seguir operando mientras
    // el aviso está abierto.
    this.storage.logout();

    await Swal.fire({
      title: 'Sesión cerrada en este equipo',
      text: message?.mensaje
        || 'Iniciaste sesión en otro equipo. Por seguridad, aquí se cerró la sesión.',
      icon: 'warning',
      confirmButtonText: 'Ir a iniciar sesión',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    window.location.replace(`${window.location.origin}/iniciar-sesion`);
    this.cerrando = false;
  }
}
