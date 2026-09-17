import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { DialogSolicitudesAutorizacionComponent } from '../dialog-solicitudes-autorizacion/dialog-solicitudes-autorizacion.component';

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
  /** 'icono' para la cabecera general; 'canal' para la barra de la pantalla de venta. */
  @Input() variante: 'icono' | 'canal' = 'icono';

  readonly esAprobador$ = this.realtime.esAprobador$;
  readonly pendientes$ = this.realtime.pendientes$;

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
