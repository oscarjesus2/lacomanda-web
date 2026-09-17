import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription, firstValueFrom } from 'rxjs';
import { SolicitudAutorizacion } from 'src/app/models/solicitud-autorizacion.models';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { SolicitudAutorizacionService } from 'src/app/services/solicitud-autorizacion.service';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { Notificar } from 'src/app/shared/notificaciones';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';

/** Bandeja del aprobador: aprobar ejecuta la acción; denegar pide un motivo opcional. */
@Component({
  selector: 'app-dialog-solicitudes-autorizacion',
  templateUrl: './dialog-solicitudes-autorizacion.component.html',
  styleUrls: ['./dialog-solicitudes-autorizacion.component.css'],
})
export class DialogSolicitudesAutorizacionComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudAutorizacion[] = [];
  readonly procesando = new Set<number>();
  private subscription?: Subscription;

  constructor(
    private readonly dialogRef: MatDialogRef<DialogSolicitudesAutorizacionComponent>,
    private readonly dialog: MatDialog,
    private readonly api: SolicitudAutorizacionService,
    private readonly realtime: SolicitudesAutorizacionRealtimeService,
    private readonly textCatalog: TenantTextCatalogService,
  ) {}

  ngOnInit(): void {
    this.subscription = this.realtime.pendientes$.subscribe(solicitudes => {
      this.solicitudes = solicitudes;
    });
    void this.realtime.sincronizar();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async aprobar(solicitud: SolicitudAutorizacion): Promise<void> {
    if (this.procesando.has(solicitud.IdSolicitud)) return;
    this.procesando.add(solicitud.IdSolicitud);
    try {
      const resultado = await firstValueFrom(this.api.aprobar(solicitud.IdSolicitud));
      this.realtime.quitar(solicitud.IdSolicitud);
      if (resultado.Estado === 'Aprobada') {
        Notificar.exito(this.textCatalog.get('requestApproved'), resultado.Descripcion);
      } else {
        // El objetivo cambió mientras esperaba: el servidor no ejecutó nada.
        Notificar.informacion(
          this.textCatalog.get('requestWithoutEffect'),
          resultado.Observacion ?? undefined,
        );
      }
    } catch {
      // El interceptor ya mostró el motivo (p. ej. la resolvió otro administrador).
      await this.realtime.sincronizar();
    } finally {
      this.procesando.delete(solicitud.IdSolicitud);
    }
  }

  async denegar(solicitud: SolicitudAutorizacion): Promise<void> {
    if (this.procesando.has(solicitud.IdSolicitud)) return;
    const motivo = await firstValueFrom(this.dialog.open(DialogMTextComponent, {
      width: '800px',
      data: { title: this.textCatalog.get('denyReasonTitle') },
    }).afterClosed());
    if (!motivo) return;

    this.procesando.add(solicitud.IdSolicitud);
    try {
      await firstValueFrom(this.api.denegar(
        solicitud.IdSolicitud,
        (motivo.value ?? '').trim() || null,
      ));
      this.realtime.quitar(solicitud.IdSolicitud);
      Notificar.exito(this.textCatalog.get('requestDenied'), solicitud.Descripcion);
    } catch {
      await this.realtime.sincronizar();
    } finally {
      this.procesando.delete(solicitud.IdSolicitud);
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
