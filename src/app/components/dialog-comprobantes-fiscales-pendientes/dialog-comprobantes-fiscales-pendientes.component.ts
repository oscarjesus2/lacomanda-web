import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ComprobanteFiscalPendiente } from 'src/app/models/comprobante-fiscal-pendiente.models';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { DialogCorregirVentaComponent } from '../dialog-corregir-venta/dialog-corregir-venta.component';
import { AeatEnvioMonitorService } from 'src/app/services/aeat-envio-monitor.service';
import { Notificar } from 'src/app/shared/notificaciones';
import { firstValueFrom } from 'rxjs';
import { CpeEnvioMonitorService } from 'src/app/services/cpe-envio-monitor.service';

@Component({
  selector: 'app-dialog-comprobantes-fiscales-pendientes',
  templateUrl: './dialog-comprobantes-fiscales-pendientes.component.html',
  styleUrls: [
    '../dialog-solicitudes-autorizacion/dialog-solicitudes-autorizacion.component.css',
  ],
})
export class DialogComprobantesFiscalesPendientesComponent
implements OnInit, OnDestroy {
  comprobantes: ComprobanteFiscalPendiente[] = [];
  cargando = true;
  readonly procesando = new Set<number>();
  private subscription?: Subscription;

  constructor(
    private readonly dialogRef:
      MatDialogRef<DialogComprobantesFiscalesPendientesComponent>,
    private readonly dialog: MatDialog,
    private readonly notificaciones: SolicitudesAutorizacionRealtimeService,
    private readonly aeat: AeatEnvioMonitorService,
    private readonly cpe: CpeEnvioMonitorService,
  ) {}

  ngOnInit(): void {
    this.subscription = this.notificaciones
      .comprobantesFiscalesPendientes$
      .subscribe(comprobantes => {
        this.comprobantes = comprobantes;
        this.cargando = false;
      });
    void this.notificaciones.sincronizarComprobantesFiscales();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async corregir(comprobante: ComprobanteFiscalPendiente): Promise<void> {
    if (comprobante.AccionCodigo.startsWith('REINTENTAR_ENVIO_')) {
      await this.reintentarEnvio(comprobante);
      return;
    }

    if (comprobante.AccionCodigo === 'SUBSANAR_REGISTRO') {
      await this.subsanarAeat(comprobante);
      return;
    }

    this.dialog.open(DialogCorregirVentaComponent, {
      width: 'min(1120px, 96vw)',
      maxWidth: '96vw',
      disableClose: true,
      data: {
        idVenta: comprobante.IdVenta,
        origenRechazoFiscal: true,
      },
    }).afterClosed().subscribe(resultado => {
      if (resultado?.actualizado) {
        void this.notificaciones.sincronizarComprobantesFiscales();
      }
    });
  }

  claveProcesamiento(comprobante: ComprobanteFiscalPendiente): number {
    return comprobante.IdRegistroFiscal ?? -comprobante.IdVenta;
  }

  private async subsanarAeat(
    comprobante: ComprobanteFiscalPendiente,
  ): Promise<void> {
    const idRegistro = comprobante.IdRegistroFiscal;
    if (!idRegistro || this.procesando.has(idRegistro)) {
      return;
    }

    const confirmado = await Notificar.confirmar({
      titulo: `Subsanar ${comprobante.NumeroDocumento}`,
      detalle:
        'Se generará un nuevo registro fiscal AEAT con el mismo número de factura. ' +
        'No se emitirá otro comprobante ni habrá que comunicar un correlativo nuevo al cliente.',
      textoConfirmar: 'Generar subsanación',
      textoCancelar: 'Cancelar',
    });
    if (!confirmado) {
      return;
    }

    this.procesando.add(idRegistro);
    try {
      const response = await firstValueFrom(this.aeat.subsanar(idRegistro));
      await Notificar.exito(
        'Subsanación programada',
        response.Message ||
          `El registro de ${comprobante.NumeroDocumento} quedó en cola.`,
      );
      await this.notificaciones.sincronizarComprobantesFiscales();
    } catch {
      // El interceptor presenta el mensaje preciso del backend.
    } finally {
      this.procesando.delete(idRegistro);
    }
  }

  private async reintentarEnvio(
    comprobante: ComprobanteFiscalPendiente,
  ): Promise<void> {
    const key = this.claveProcesamiento(comprobante);
    if (this.procesando.has(key)) {
      return;
    }

    const confirmado = await Notificar.confirmar({
      titulo: `Reintentar ${comprobante.NumeroDocumento}`,
      detalle:
        'El error técnico agotó los intentos automáticos. ' +
        'Se programará un nuevo intento sin cambiar el comprobante ni su correlativo.',
      textoConfirmar: 'Reintentar envío',
      textoCancelar: 'Cancelar',
    });
    if (!confirmado) {
      return;
    }

    this.procesando.add(key);
    try {
      const request = comprobante.SistemaFiscal === 'AEAT'
        ? this.aeat.reintentar(
          [comprobante.IdVenta],
          comprobante.OperacionCodigo === 'ANULACION'
            ? 'ANULACION'
            : 'ALTA',
        )
        : this.cpe.reintentar(
          [comprobante.IdVenta],
          comprobante.OperacionCodigo === 'ANULACION'
            ? 'ANULACION'
            : 'EMISION',
        );
      const response = await firstValueFrom(request);
      await Notificar.exito(
        'Reintento programado',
        response.Message ||
          `El envío de ${comprobante.NumeroDocumento} quedó nuevamente en cola.`,
      );
      await this.notificaciones.sincronizarComprobantesFiscales();
    } catch {
      // El interceptor presenta el mensaje preciso del backend.
    } finally {
      this.procesando.delete(key);
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
