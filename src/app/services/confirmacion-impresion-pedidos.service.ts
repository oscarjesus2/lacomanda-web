import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { PedidoService } from './pedido.service';
import {
  LoteImpresionPedidoCompletado,
  QzTrayV224Service,
} from './qz-tray-v224.service';

@Injectable({
  providedIn: 'root'
})
export class ConfirmacionImpresionPedidosService {
  private static readonly reintentoMs = 15_000;

  private iniciado = false;
  private procesando = false;
  private temporizadorReintento?: ReturnType<typeof setTimeout>;
  private readonly pendientes = new Map<string, LoteImpresionPedidoCompletado>();

  constructor(
    private readonly qzTray: QzTrayV224Service,
    private readonly pedidoService: PedidoService,
  ) { }

  /**
   * Mantiene el acuse fuera del componente de venta. Así, si el usuario cambia
   * de pantalla mientras QZ reintenta, la confirmación sigue viva en el ámbito
   * global de la aplicación.
   */
  iniciar(): void {
    if (this.iniciado) return;

    this.iniciado = true;
    this.qzTray.lotesCompletados$.subscribe(lote => {
      this.pendientes.set(lote.loteId, lote);
      void this.procesarPendientes();
    });
  }

  private async procesarPendientes(): Promise<void> {
    if (this.procesando || !this.pendientes.size) return;

    this.procesando = true;
    try {
      for (const [loteId, lote] of this.pendientes) {
        try {
          const response = await lastValueFrom(
            this.pedidoService.ActualizarEnviosDeImpresion(
              lote.idPedido,
              lote.nroCuenta,
            ),
          );

          if (!response?.Success) {
            throw new Error(response?.Message || 'El backend rechazó el acuse de impresión.');
          }

          this.pendientes.delete(loteId);
        } catch (error) {
          console.error(
            'No se pudo confirmar todavía la impresión de la comanda. Se reintentará:',
            error,
          );
          this.programarReintento();
          return;
        }
      }
    } finally {
      this.procesando = false;
    }
  }

  private programarReintento(): void {
    if (this.temporizadorReintento) return;

    this.temporizadorReintento = setTimeout(() => {
      this.temporizadorReintento = undefined;
      void this.procesarPendientes();
    }, ConfirmacionImpresionPedidosService.reintentoMs);
  }
}
