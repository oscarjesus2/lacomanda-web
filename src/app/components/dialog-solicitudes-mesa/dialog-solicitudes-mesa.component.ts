import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { DialogConfirmarPresenciaMesaComponent } from '../dialog-confirmar-presencia-mesa/dialog-confirmar-presencia-mesa.component';
import { SolicitudMesaPendiente } from 'src/app/models/mesa-cliente.models';
import { MesaClienteService } from 'src/app/services/mesa-cliente.service';
import { SolicitudesMesaRealtimeService } from 'src/app/services/solicitudes-mesa-realtime.service';
import { Notificar } from 'src/app/shared/notificaciones';

export interface DialogSolicitudesMesaData { idCaja: number; idTurno: number; identificadorEstacion: string; }

@Component({ selector: 'app-dialog-solicitudes-mesa', templateUrl: './dialog-solicitudes-mesa.component.html', styleUrls: ['./dialog-solicitudes-mesa.component.css'] })
export class DialogSolicitudesMesaComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudMesaPendiente[] = [];
  cargando = true;
  procesando?: number;
  confirmando?: number;
  private solicitudesSubscription?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogSolicitudesMesaData,
    private readonly dialogRef: MatDialogRef<DialogSolicitudesMesaComponent>,
    private readonly dialog: MatDialog,
    private readonly mesaClienteService: MesaClienteService,
    private readonly solicitudesMesaRealtime: SolicitudesMesaRealtimeService
  ) {}

  ngOnInit(): void {
    this.solicitudesMesaRealtime.iniciar();
    this.solicitudesSubscription = this.solicitudesMesaRealtime.solicitudes$.subscribe({
      next: solicitudes => { this.solicitudes = solicitudes; this.cargando = false; }
    });
  }

  ngOnDestroy(): void { this.solicitudesSubscription?.unsubscribe(); }

  confirmar(solicitud: SolicitudMesaPendiente): void {
    if (this.procesando === solicitud.IdSesion || this.confirmando === solicitud.IdSesion) return;

    this.confirmando = solicitud.IdSesion;
    const confirmacion = this.dialog.open(DialogConfirmarPresenciaMesaComponent, {
      autoFocus: true,
      width: 'min(480px, 92vw)',
      maxWidth: '92vw',
      panelClass: 'dialog-window--compact',
      data: {
        espacio: solicitud.Espacio,
        numero: solicitud.Numero,
        codigoVisual: solicitud.CodigoVisual
      }
    });

    confirmacion.afterClosed().subscribe(nroPax => {
      this.confirmando = undefined;
      if (!nroPax) return;

      this.procesando = solicitud.IdSesion;
      this.mesaClienteService.confirmar(solicitud.IdSesion, { IdCaja: this.data.idCaja, IdTurno: this.data.idTurno, NroPax: nroPax, IdentificadorEstacion: this.data.identificadorEstacion }).subscribe({
        next: () => { this.procesando = undefined; this.solicitudes = this.solicitudes.filter(x => x.IdSesion !== solicitud.IdSesion); Notificar.exito('Mesa habilitada', 'El cliente ya puede usar la carta digital.'); },
        error: () => this.procesando = undefined
      });
    });
  }

  rechazar(solicitud: SolicitudMesaPendiente): void {
    this.procesando = solicitud.IdSesion;
    this.mesaClienteService.rechazar(solicitud.IdSesion).subscribe({
      next: () => { this.procesando = undefined; this.solicitudes = this.solicitudes.filter(x => x.IdSesion !== solicitud.IdSesion); },
      error: () => this.procesando = undefined
    });
  }

  cerrar(): void { this.dialogRef.close(); }
}
