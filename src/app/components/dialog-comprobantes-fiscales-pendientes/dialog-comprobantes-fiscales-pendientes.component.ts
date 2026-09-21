import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ComprobanteFiscalPendiente } from 'src/app/models/comprobante-fiscal-pendiente.models';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { DialogCorregirVentaComponent } from '../dialog-corregir-venta/dialog-corregir-venta.component';

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
  private subscription?: Subscription;

  constructor(
    private readonly dialogRef:
      MatDialogRef<DialogComprobantesFiscalesPendientesComponent>,
    private readonly dialog: MatDialog,
    private readonly notificaciones: SolicitudesAutorizacionRealtimeService,
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

  corregir(comprobante: ComprobanteFiscalPendiente): void {
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

  cerrar(): void {
    this.dialogRef.close();
  }
}
