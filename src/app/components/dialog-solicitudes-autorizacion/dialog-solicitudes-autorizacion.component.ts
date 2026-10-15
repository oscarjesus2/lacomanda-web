import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggle } from '@angular/material/slide-toggle';
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
import { CesiaStockService } from 'src/app/services/cesia-stock.service';
import { NotificacionesPushService } from 'src/app/services/notificaciones-push.service';
import { BandejaNotificacionesService } from 'src/app/services/bandeja-notificaciones.service';
import { NotificacionResumen, TipoNotificacion } from 'src/app/models/notificacion.models';

/** Bandeja del aprobador: aprobar ejecuta la acción; denegar pide un motivo opcional. */
@Component({
  selector: 'app-dialog-solicitudes-autorizacion',
  templateUrl: './dialog-solicitudes-autorizacion.component.html',
})
export class DialogSolicitudesAutorizacionComponent implements OnInit, OnDestroy {
  vista: 'bandeja' | 'preferencias' | 'operaciones' = 'bandeja';
  pendientes: NotificacionResumen[] = [];
  leidas: NotificacionResumen[] = [];
  tipos: TipoNotificacion[] = [];
  cargandoTipos = false;
  errorTipos = false;
  readonly guardandoTipos = new Set<string>();
  readonly leyendo = new Set<string>();
  readonly errorBandeja$ = this.bandeja.error$;
  cargandoBandeja = true;
  solicitudes: SolicitudAutorizacion[] = [];
  readonly alertasStock$ = this.cesia.alertas$;
  puedeElegirPush = false;
  dispositivoPushVinculado = false;
  recibirPush = false;
  pushDisponible = false;
  cargandoPush = true;
  guardandoPush = false;
  errorPush = false;
  comprobantesFiscales: ComprobanteFiscalPendiente[] = [];
  readonly procesando = new Set<number>();
  /** Canales generales del usuario; los avisos internos siempre se mantienen. */
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
    private readonly cesia: CesiaStockService,
    private readonly push: NotificacionesPushService,
    private readonly bandeja: BandejaNotificacionesService,
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
    this.subscriptions.add(this.bandeja.notificaciones$.subscribe(items => {
      this.pendientes = items.filter(n => !n.LeidaUtc);
      this.leidas = items.filter(n => !!n.LeidaUtc).slice(0, 3);
    }));
    void this.inicializar();
  }

  private async inicializar(): Promise<void> {
    await this.realtime.sincronizar();
    await this.actualizarBandeja();
  }

  async actualizarBandeja(): Promise<void> {
    this.cargandoBandeja = true;
    try { await this.bandeja.actualizar(); }
    catch { /* La bandeja conserva la última consulta y muestra la opción de reintentar. */ }
    finally { this.cargandoBandeja = false; }
  }

  async configurar(): Promise<void> {
    this.vista = this.vista === 'preferencias' ? 'bandeja' : 'preferencias';
    if (this.vista === 'preferencias') await Promise.all([this.cargarPreferencias(), this.cargarPush(), this.cargarTipos()]);
  }

  async cargarTipos(): Promise<void> {
    this.cargandoTipos = true;
    this.errorTipos = false;
    try { this.tipos = await this.bandeja.tipos(); }
    catch { this.errorTipos = true; }
    finally { this.cargandoTipos = false; }
  }

  async cambiarTipo(tipo: TipoNotificacion, recibir: boolean): Promise<void> {
    if (this.guardandoTipos.has(tipo.Codigo)) return;
    const anterior = tipo.Recibir;
    tipo.Recibir = recibir;
    this.guardandoTipos.add(tipo.Codigo);
    this.errorTipos = false;
    try { await this.bandeja.suscribir(tipo.Codigo, recibir); }
    catch { tipo.Recibir = anterior; this.errorTipos = true; }
    finally { this.guardandoTipos.delete(tipo.Codigo); }
  }

  async marcarLeida(aviso: NotificacionResumen): Promise<void> {
    if (this.leyendo.has(aviso.Id)) return;
    this.leyendo.add(aviso.Id);
    try { await this.bandeja.marcarLeida(aviso.Id); }
    catch { /* El interceptor muestra el error; la notificación sigue pendiente. */ }
    finally { this.leyendo.delete(aviso.Id); }
  }

  icono(aviso: NotificacionResumen): string {
    return aviso.CodigoTipo === 'CESIA_STOCK' ? 'auto_awesome'
      : aviso.CodigoTipo === 'FISCAL_PENDIENTE' ? 'receipt_long' : 'approval';
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
      const preferencias = await this.push.guardarPreferencias({ RecibirPorCorreo: recibir });
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
      const preferencias = await this.push.obtenerPreferencias();
      this.recibirPorCorreo = preferencias.RecibirPorCorreo;
      this.puedeElegirCorreo = preferencias.PuedeElegirCorreo || preferencias.RecibirPorCorreo;
    } catch {
      this.puedeElegirCorreo = false;
    }
  }

  async cargarPush(): Promise<void> {
    this.cargandoPush = true;
    this.errorPush = false;
    try {
      const estado = await this.push.obtenerEstadoGeneral();
      this.recibirPush = estado.Habilitado;
      this.pushDisponible = estado.Disponible;
      this.puedeElegirPush = estado.PuedeElegir || estado.Habilitado;
      this.dispositivoPushVinculado = estado.Vinculado;
    } catch {
      this.errorPush = true;
    } finally {
      this.cargandoPush = false;
    }
  }

  async cambiarPush(habilitado: boolean, interruptor?: MatSlideToggle): Promise<void> {
    if (this.guardandoPush) {
      if (interruptor) interruptor.checked = this.recibirPush;
      return;
    }
    const anterior = this.recibirPush;
    this.recibirPush = habilitado;
    this.guardandoPush = true;
    this.errorPush = false;
    try {
      const estado = await this.push.cambiarPreferenciaPush(habilitado);
      this.recibirPush = estado.RecibirPorPush;
      if (habilitado) this.dispositivoPushVinculado = true;
    } catch {
      this.recibirPush = anterior;
      this.errorPush = true;
    } finally {
      this.guardandoPush = false;
      // Material cambia su estado antes del evento. Un rechazo inmediato puede
      // volver al mismo valor del binding sin que Angular actualice el control.
      if (interruptor) interruptor.checked = this.recibirPush;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async vincularDispositivoPush(): Promise<void> {
    if (this.guardandoPush) return;
    this.guardandoPush = true;
    this.errorPush = false;
    try {
      if (!await this.push.activar()) throw new Error('Push unavailable');
      await this.cargarPush();
    } catch {
      this.errorPush = true;
    } finally {
      this.guardandoPush = false;
    }
  }

  abrirComprobantesFiscales(): void {
    this.dialog.open(DialogComprobantesFiscalesPendientesComponent, {
      width: 'min(760px, 96vw)',
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
