import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TrabajoImpresion } from '../models/trabajo-impresion.models';
import { DeviceCapabilitiesService } from './device-capabilities.service';
import { QzTrayV224Service } from './qz-tray-v224.service';
import { StorageService } from './storage.service';
import { TrabajosImpresionService } from './trabajos-impresion.service';

/**
 * Respaldo web para imprimir trabajos originados en moviles o QR.
 *
 * No sondea la API. Consulta la cola al conectar, al reconectar y cuando
 * SignalR avisa que hay trabajos. Los pedidos creados por este ordenador no
 * pasan por aqui: VentaComponent recibe sus bytes en la respuesta HTTP.
 */
@Injectable({ providedIn: 'root' })
export class AgenteImpresionPedidosService {
  private static readonly reintentoConexionMs = 30_000;
  private hub?: signalR.HubConnection;
  private reintentoConexion?: ReturnType<typeof setTimeout>;
  private procesando = false;
  private detenido = true;

  constructor(
    private readonly storage: StorageService,
    private readonly trabajos: TrabajosImpresionService,
    private readonly qz: QzTrayV224Service,
    private readonly zone: NgZone,
    private readonly deviceCapabilities: DeviceCapabilitiesService,
  ) {}

  async iniciar(): Promise<void> {
    if (!this.detenido
        || !this.deviceCapabilities.requiresLocalPrintBridge()
        || !this.puedeParticipar()) {
      return;
    }

    // Es obligatorio comprobar QZ antes de registrarse y, sobre todo, antes
    // de reclamar. Asi un navegador sin QZ nunca consume intentos de la cola.
    if (!await this.qz.isQzTrayRunning()) return;

    this.detenido = false;
    await this.conectarSignalR();
  }

  detener(): void {
    this.detenido = true;
    if (this.reintentoConexion) {
      clearTimeout(this.reintentoConexion);
      this.reintentoConexion = undefined;
    }

    const hub = this.hub;
    this.hub = undefined;
    if (hub) void hub.stop();
  }

  private puedeParticipar(): boolean {
    return Boolean(
      this.storage.getCurrentToken()
      && this.storage.getCurrentIP()?.trim(),
    );
  }

  private crearHub(): signalR.HubConnection {
    const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${apiRoot}/hubs/trabajos-impresion`, {
        accessTokenFactory: () => this.storage.getCurrentToken() ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hub.on('TrabajosImpresionPendientes', () => {
      this.zone.runOutsideAngular(() => void this.procesarPendientes());
    });
    hub.onreconnected(() => {
      this.zone.runOutsideAngular(() => void this.registrarYProcesar());
    });
    hub.onclose(() => {
      if (!this.detenido) this.programarReconexion();
    });
    return hub;
  }

  private async conectarSignalR(): Promise<void> {
    if (this.detenido || !this.puedeParticipar()) return;
    if (!this.hub) this.hub = this.crearHub();
    if (this.hub.state !== signalR.HubConnectionState.Disconnected) return;

    try {
      await this.hub.start();
      await this.registrarYProcesar();
    } catch (error) {
      console.warn('SignalR de impresion no esta disponible.', error);
      this.programarReconexion();
    }
  }

  private programarReconexion(): void {
    if (this.detenido || this.reintentoConexion) return;
    this.reintentoConexion = setTimeout(() => {
      this.reintentoConexion = undefined;
      void this.conectarSignalR();
    }, AgenteImpresionPedidosService.reintentoConexionMs);
  }

  private async registrarYProcesar(): Promise<void> {
    if (!this.hub
        || this.hub.state !== signalR.HubConnectionState.Connected
        || !this.puedeParticipar()) return;

    try {
      await this.hub.invoke(
        'RegistrarAgente',
        this.storage.getCurrentIP()!.trim(),
        true,
      );
      await this.procesarPendientes();
    } catch (error) {
      console.warn('No se pudo registrar el agente web de impresion.', error);
      await this.reiniciarSignalR();
    }
  }

  private async procesarPendientes(): Promise<void> {
    if (this.procesando || this.detenido || !this.puedeParticipar()) return;
    this.procesando = true;

    try {
      while (!this.detenido) {
        if (!await this.qz.isQzTrayRunning()) {
          // QZ se cerro despues de entrar a venta. Se abandona el grupo y no se
          // reclama nada mas hasta una nueva validacion al volver a ingresar.
          this.detener();
          break;
        }

        const response = await firstValueFrom(this.trabajos.reclamar({
          IdentificadorEstacion: this.storage.getCurrentIP()!.trim(),
          Cantidad: 1,
          QzDisponible: true,
        }));
        const trabajo = response.Data?.[0];
        if (!trabajo) break;

        if (!await this.imprimir(trabajo)) {
          this.detener();
          break;
        }
      }
    } catch (error) {
      console.warn('No se pudieron reclamar trabajos de impresion.', error);
      if (!this.detenido) await this.reiniciarSignalR();
    } finally {
      this.procesando = false;
    }
  }

  private async reiniciarSignalR(): Promise<void> {
    const hub = this.hub;
    this.hub = undefined;
    if (hub) {
      try {
        await hub.stop();
      } catch (error) {
        console.warn('No se pudo cerrar SignalR de impresion.', error);
      }
    }

    this.programarReconexion();
  }

  private async imprimir(trabajo: TrabajoImpresion): Promise<boolean> {
    try {
      const impreso = await this.qz.printPDF(
        trabajo.Documento,
        trabajo.NombreImpresora,
        false,
        false,
      );
      if (!impreso) {
        throw new Error('QZ no confirmo la impresion del documento.');
      }

      await firstValueFrom(this.trabajos.confirmar(
        trabajo.IdTrabajoImpresion,
        { TokenReclamo: trabajo.TokenReclamo },
      ));
      return true;
    } catch (error) {
      const mensaje = error instanceof Error
        ? error.message
        : 'Fallo no identificado al imprimir la comanda.';
      try {
        await firstValueFrom(this.trabajos.fallar(
          trabajo.IdTrabajoImpresion,
          {
            TokenReclamo: trabajo.TokenReclamo,
            Error: mensaje.substring(0, 500),
          },
        ));
      } catch (registroError) {
        console.error('No se pudo liberar el trabajo de impresion.', registroError);
      }
      return false;
    }
  }
}
