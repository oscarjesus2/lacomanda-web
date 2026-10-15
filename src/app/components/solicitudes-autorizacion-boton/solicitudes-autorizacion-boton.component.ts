import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { DialogSolicitudesAutorizacionComponent } from '../dialog-solicitudes-autorizacion/dialog-solicitudes-autorizacion.component';
import { combineLatest, map } from 'rxjs';
import { CesiaStockService } from 'src/app/services/cesia-stock.service';

/**
 * Globo de solicitudes de autorización. Solo se muestra a aprobadores
 * (administradores y cajeros con permiso).
 */
@Component({
  selector: 'app-solicitudes-autorizacion-boton',
  templateUrl: './solicitudes-autorizacion-boton.component.html',
  styleUrls: ['./solicitudes-autorizacion-boton.component.css'],
})
export class SolicitudesAutorizacionBotonComponent {
  /** Adapta el acceso a la cabecera, la barra de canal o el centro de caja. */
  @Input() variante: 'icono' | 'canal' | 'panel' = 'icono';

  readonly puedeVerCentro$ = combineLatest([
    this.realtime.puedeVerCentroNotificaciones$, this.cesia.habilitado$,
  ]).pipe(map(([centro, cesia]) => centro || cesia));
  readonly pendientes$ = combineLatest([
    this.realtime.pendientes$,
    this.realtime.comprobantesFiscalesPendientes$,
    this.cesia.alertas$,
  ]).pipe(map(([solicitudes, comprobantes, alertas]) =>
    solicitudes.length + comprobantes.length + alertas.length));

  constructor(
    private readonly realtime: SolicitudesAutorizacionRealtimeService,
    private readonly dialog: MatDialog,
    private readonly cesia: CesiaStockService,
  ) {}

  abrir(): void {
    this.dialog.open(DialogSolicitudesAutorizacionComponent, {
      width: 'min(760px, 96vw)',
      maxWidth: '96vw',
    });
  }
}
