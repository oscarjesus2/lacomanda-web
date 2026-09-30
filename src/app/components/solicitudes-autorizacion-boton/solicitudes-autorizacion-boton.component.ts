import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { DialogSolicitudesAutorizacionComponent } from '../dialog-solicitudes-autorizacion/dialog-solicitudes-autorizacion.component';
import { combineLatest, map } from 'rxjs';

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

  readonly puedeVerCentro$ = this.realtime.puedeVerCentroNotificaciones$;
  readonly pendientes$ = combineLatest([
    this.realtime.pendientes$,
    this.realtime.comprobantesFiscalesPendientes$,
  ]).pipe(map(([solicitudes, comprobantes]) =>
    solicitudes.length + comprobantes.length));

  constructor(
    private readonly realtime: SolicitudesAutorizacionRealtimeService,
    private readonly dialog: MatDialog,
  ) {}

  abrir(): void {
    this.dialog.open(DialogSolicitudesAutorizacionComponent, {
      width: 'min(760px, 96vw)',
      maxWidth: '96vw',
    });
  }
}
