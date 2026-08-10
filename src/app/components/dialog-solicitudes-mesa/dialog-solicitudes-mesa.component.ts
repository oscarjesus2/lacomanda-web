import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { SolicitudMesaPendiente } from 'src/app/models/mesa-cliente.models';
import { MesaClienteService } from 'src/app/services/mesa-cliente.service';
import { SolicitudesMesaRealtimeService } from 'src/app/services/solicitudes-mesa-realtime.service';

export interface DialogSolicitudesMesaData { idCaja: number; idTurno: number; identificadorEstacion: string; }

@Component({ selector: 'app-dialog-solicitudes-mesa', templateUrl: './dialog-solicitudes-mesa.component.html', styleUrls: ['./dialog-solicitudes-mesa.component.css'] })
export class DialogSolicitudesMesaComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudMesaPendiente[] = [];
  cargando = true;
  procesando?: number;
  private solicitudesSubscription?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogSolicitudesMesaData,
    private readonly dialogRef: MatDialogRef<DialogSolicitudesMesaComponent>,
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
    Swal.fire({
      title: `Confirmar ${solicitud.Espacio} ${solicitud.Numero}`,
      text: `Comprueba visualmente que el cliente muestra el código ${solicitud.CodigoVisual}.`,
      input: 'number', inputLabel: 'Número de personas', inputValue: 1,
      inputAttributes: { min: '1', step: '1' }, showCancelButton: true,
      confirmButtonText: 'CONFIRMAR PRESENCIA', cancelButtonText: 'CANCELAR',
      preConfirm: value => Number(value) > 0 ? Number(value) : Swal.showValidationMessage('Ingresa un número de personas válido.')
    }).then(result => {
      if (!result.isConfirmed) return;
      this.procesando = solicitud.IdSesion;
      this.mesaClienteService.confirmar(solicitud.IdSesion, { IdCaja: this.data.idCaja, IdTurno: this.data.idTurno, NroPax: Number(result.value), IdentificadorEstacion: this.data.identificadorEstacion }).subscribe({
        next: () => { this.procesando = undefined; this.solicitudes = this.solicitudes.filter(x => x.IdSesion !== solicitud.IdSesion); Swal.fire('Mesa habilitada', 'El cliente ya puede usar la carta digital.', 'success'); },
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
