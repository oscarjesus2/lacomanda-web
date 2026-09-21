import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription, firstValueFrom } from 'rxjs';
import { SolicitudAutorizacion } from 'src/app/models/solicitud-autorizacion.models';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { TenantTextKey } from 'src/app/services/localization/tenant-texts.en';
import { SolicitudAutorizacionService } from 'src/app/services/solicitud-autorizacion.service';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { Notificar } from 'src/app/shared/notificaciones';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';
import { ComprobanteFiscalPendiente } from 'src/app/models/comprobante-fiscal-pendiente.models';
import { DialogComprobantesFiscalesPendientesComponent } from '../dialog-comprobantes-fiscales-pendientes/dialog-comprobantes-fiscales-pendientes.component';

/** Bandeja del aprobador: aprobar ejecuta la acción; denegar pide un motivo opcional. */
@Component({
  selector: 'app-dialog-solicitudes-autorizacion',
  templateUrl: './dialog-solicitudes-autorizacion.component.html',
  styleUrls: ['./dialog-solicitudes-autorizacion.component.css'],
})
export class DialogSolicitudesAutorizacionComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudAutorizacion[] = [];
  comprobantesFiscales: ComprobanteFiscalPendiente[] = [];
  readonly procesando = new Set<number>();
  /** Preferencia propia: recibir también las solicitudes por correo. */
  recibirPorCorreo = false;
  puedeElegirCorreo = false;
  guardandoPreferencia = false;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly dialogRef: MatDialogRef<DialogSolicitudesAutorizacionComponent>,
    private readonly dialog: MatDialog,
    private readonly api: SolicitudAutorizacionService,
    private readonly realtime: SolicitudesAutorizacionRealtimeService,
    private readonly textCatalog: TenantTextCatalogService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.realtime.pendientes$.subscribe(solicitudes => {
      this.solicitudes = solicitudes;
    }));
    this.subscriptions.add(
      this.realtime.comprobantesFiscalesPendientes$.subscribe(comprobantes => {
        this.comprobantesFiscales = comprobantes;
      }),
    );
    void this.realtime.sincronizar();
    void this.cargarPreferencias();
  }

  /** Etiqueta del tipo de solicitud, para no mostrar el nombre técnico. */
  etiquetaTipo(solicitud: SolicitudAutorizacion): string {
    const claves: Record<string, TenantTextKey> = {
      AnularProducto: 'voidProductRequest',
      CambiarCamarero: 'changeAttendantRequest',
      AnularPedido: 'voidOrderRequest',
      DescuentoPedido: 'orderDiscountRequest',
      DescuentoEntrada: 'ticketDiscountRequest',
      EntradasGratis: 'freeTicketsRequest',
    };
    const clave = claves[solicitud.Tipo];
    return clave ? this.textCatalog.get(clave) : solicitud.Tipo;
  }

  async cambiarPreferenciaCorreo(recibir: boolean): Promise<void> {
    this.guardandoPreferencia = true;
    try {
      const preferencias = await firstValueFrom(this.api.guardarPreferencias(recibir));
      this.recibirPorCorreo = preferencias.RecibirPorCorreo;
      Notificar.exito(this.textCatalog.get(
        preferencias.RecibirPorCorreo ? 'emailAlertsOn' : 'emailAlertsOff',
      ));
    } catch {
      // El interceptor ya mostró el motivo (p. ej. el usuario no tiene correo).
      await this.cargarPreferencias();
    } finally {
      this.guardandoPreferencia = false;
    }
  }

  private async cargarPreferencias(): Promise<void> {
    try {
      const preferencias = await firstValueFrom(this.api.obtenerPreferencias());
      this.recibirPorCorreo = preferencias.RecibirPorCorreo;
      this.puedeElegirCorreo = preferencias.EsAprobador && !!preferencias.Email;
    } catch {
      this.puedeElegirCorreo = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  abrirComprobantesFiscales(): void {
    this.dialog.open(DialogComprobantesFiscalesPendientesComponent, {
      width: 'min(900px, 96vw)',
      maxWidth: '96vw',
    });
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
