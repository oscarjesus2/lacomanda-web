import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { SolicitudMesaPendiente } from 'src/app/models/mesa-cliente.models';
import { MesaClienteService } from 'src/app/services/mesa-cliente.service';

export interface DialogSolicitudesMesaData { idCaja: number; idTurno: number; identificadorEstacion: string; }

@Component({ selector: 'app-dialog-solicitudes-mesa', templateUrl: './dialog-solicitudes-mesa.component.html', styleUrls: ['./dialog-solicitudes-mesa.component.css'] })
export class DialogSolicitudesMesaComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudMesaPendiente[] = [];
  cargando = true;
  procesando?: number;
  private polling?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogSolicitudesMesaData,
    private readonly dialogRef: MatDialogRef<DialogSolicitudesMesaComponent>,
    private readonly mesaClienteService: MesaClienteService
  ) {}

  ngOnInit(): void {
    this.polling = timer(0, 4000).pipe(switchMap(() => this.mesaClienteService.listarPendientes())).subscribe({
      next: response => { this.solicitudes = response.Data || []; this.cargando = false; },
      error: () => this.cargando = false
    });
  }

  ngOnDestroy(): void { this.polling?.unsubscribe(); }

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
