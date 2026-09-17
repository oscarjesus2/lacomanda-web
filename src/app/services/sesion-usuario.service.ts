import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { DeviceIdentifierService } from './device-identifier.service';
import { StorageService } from './storage.service';

interface SesionCerradaMessage {
  mensaje?: string;
}

interface SesionRegistrada {
  SesionAnteriorCerrada?: boolean;
  sesionAnteriorCerrada?: boolean;
}

/**
 * Una persona opera en un equipo a la vez. Al entrar, este equipo pasa a ser
 * la sesión válida; el anterior recibe el aviso y vuelve al acceso (y, si se
 * perdió el aviso, su siguiente petición responde 401).
 */
@Injectable({ providedIn: 'root' })
export class SesionUsuarioService {
  private hub?: signalR.HubConnection;
  private tokenRegistrado = '';
  private registrando = false;
  private cerrando = false;

  constructor(
    private readonly http: HttpClient,
    private readonly storage: StorageService,
    private readonly deviceIdentifier: DeviceIdentifierService,
    private readonly zone: NgZone,
  ) {}

  /** Registra esta sesión y queda escuchando por si otra la desplaza. */
  iniciar(): void {
    const token = this.storage.getCurrentToken();
    if (!token || this.registrando || this.tokenRegistrado === token) return;

    this.registrando = true;
    void this.registrar(token).finally(() => this.registrando = false);
  }

  async detener(): Promise<void> {
    this.tokenRegistrado = '';
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

  private async registrar(token: string): Promise<void> {
    try {
      const respuesta = await firstValueFrom(
        this.http.post<ApiResponse<SesionRegistrada>>(`${environment.apiUrl}/usuario/me/sesion`, {
          IdentificadorEstacion: this.deviceIdentifier.getIdentifier() || null,
        }),
      );
      this.tokenRegistrado = token;

      const datos = respuesta?.Data;
      if (datos?.SesionAnteriorCerrada ?? datos?.sesionAnteriorCerrada) {
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          icon: 'info',
          title: 'Se cerró tu sesión en el otro equipo',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
        });
      }

      await this.conectar();
    } catch {
      // Sin registro el backend no bloquea nada: se reintenta en la siguiente ruta.
    }
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
