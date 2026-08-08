import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TrabajoImpresion } from '../models/trabajo-impresion.models';
import { QzTrayV224Service } from './qz-tray-v224.service';
import { StorageService } from './storage.service';
import { TrabajosImpresionService } from './trabajos-impresion.service';
import { DeviceCapabilitiesService } from './device-capabilities.service';

/**
 * Agente global de impresión de comandas. SignalR solo despierta al agente;
 * la cola durable del backend es la fuente de verdad y el reclamo atómico
 * evita duplicados entre estaciones con QZ disponible.
 */
@Injectable({ providedIn: 'root' })
export class AgenteImpresionPedidosService {
  private readonly intervaloSondeoMs = 15_000;
  private readonly esperaSinQzMs = 60_000;
  private hub?: signalR.HubConnection;
  private intervaloSondeo?: ReturnType<typeof setInterval>;
  private procesando = false;
  private detenido = true;
  private reintentarQzDesde = 0;

  constructor(
    private readonly storage: StorageService,
    private readonly trabajos: TrabajosImpresionService,
    private readonly qz: QzTrayV224Service,
    private readonly zone: NgZone,
    private readonly deviceCapabilities: DeviceCapabilitiesService,
  ) {}

  iniciar(): void {
    if (!this.detenido
        || !this.deviceCapabilities.requiresLocalPrintBridge()) return;
    this.detenido = false;
    this.intervaloSondeo = setInterval(
      () => void this.mantenerAgente(),
      this.intervaloSondeoMs,
    );
    void this.mantenerAgente();
  }

  detener(): void {
    this.detenido = true;
    if (this.intervaloSondeo) {
      clearInterval(this.intervaloSondeo);
      this.intervaloSondeo = undefined;
    }

    const hub = this.hub;
    this.hub = undefined;
    if (hub) void hub.stop();
  }

  private async mantenerAgente(): Promise<void> {
    if (this.detenido || !this.puedeParticipar()) return;
    await this.conectarSignalR();
    await this.procesarPendientes();
  }

  private puedeParticipar(): boolean {
    return Boolean(
      this.storage.getCurrentToken()
      && this.storage.getCurrentIP()?.trim(),
    );
  }

  private async conectarSignalR(): Promise<void> {
    if (this.hub
        && this.hub.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    if (!this.hub) {
      const apiRoot = environment.apiUrl.replace(/\/api\/?$/i, '');
      this.hub = new signalR.HubConnectionBuilder()
        .withUrl(`${apiRoot}/hubs/trabajos-impresion`, {
          accessTokenFactory: () => this.storage.getCurrentToken() ?? '',
        })
        .withAutomaticReconnect([0, 2_000, 5_000, 15_000, 30_000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.hub.on('TrabajosImpresionPendientes', () => {
        this.zone.runOutsideAngular(() => void this.procesarPendientes());
      });
    }

    try {
      await this.hub.start();
    } catch (error) {
      // El sondeo periódico mantiene el sistema operativo aunque SignalR falle.
      console.warn('SignalR de impresión no está disponible.', error);
    }
  }

  private async procesarPendientes(): Promise<void> {
    if (this.procesando || this.detenido || !this.puedeParticipar()) return;
    if (Date.now() < this.reintentarQzDesde) return;

    this.procesando = true;
    try {
      if (!await this.qz.isQzTrayRunning()) {
        this.reintentarQzDesde = Date.now() + this.esperaSinQzMs;
        return;
      }

      const impresorasDisponibles = await this.qz.getAvailablePrinters();
      const response = await firstValueFrom(this.trabajos.reclamar({
        IdentificadorEstacion: this.storage.getCurrentIP()!.trim(),
        Cantidad: 3,
        ImpresorasDisponibles: impresorasDisponibles,
      }));

      for (const trabajo of response.Data ?? []) {
        await this.imprimir(trabajo);
      }
    } catch (error) {
      console.warn('No se pudieron consultar trabajos de impresión.', error);
    } finally {
      this.procesando = false;
    }
  }

  private async imprimir(trabajo: TrabajoImpresion): Promise<void> {
    try {
      const impreso = await this.qz.printPDF(
        trabajo.Documento,
        trabajo.NombreImpresora,
        false,
      );

      if (!impreso) {
        throw new Error('QZ no confirmó la impresión del documento.');
      }

      await firstValueFrom(this.trabajos.confirmar(
        trabajo.IdTrabajoImpresion,
        { TokenReclamo: trabajo.TokenReclamo },
      ));
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
        console.error('No se pudo liberar el trabajo de impresión.', registroError);
      }
    }
  }
}
