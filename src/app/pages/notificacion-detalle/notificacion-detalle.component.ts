import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, firstValueFrom } from 'rxjs';
import { NotificacionDetalle } from 'src/app/models/notificacion.models';
import { BandejaNotificacionesService } from 'src/app/services/bandeja-notificaciones.service';
import { SolicitudAutorizacionService } from 'src/app/services/solicitud-autorizacion.service';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { StockAlmacenConsultaComponent } from 'src/app/components/mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';
import { DialogSolicitudesAutorizacionComponent } from 'src/app/components/dialog-solicitudes-autorizacion/dialog-solicitudes-autorizacion.component';
import { DialogComprobantesFiscalesPendientesComponent } from 'src/app/components/dialog-comprobantes-fiscales-pendientes/dialog-comprobantes-fiscales-pendientes.component';
import { DialogMTextComponent } from 'src/app/components/dialog-mtext/dialog-mtext.component';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-notificacion-detalle',
  templateUrl: './notificacion-detalle.component.html',
})
export class NotificacionDetalleComponent implements OnInit, OnDestroy {
  detalle: NotificacionDetalle | null = null;
  cargando = true;
  error = false;
  errorLectura = false;
  procesando = false;
  private id = '';
  private subscription?: Subscription;

  constructor(private readonly route: ActivatedRoute, private readonly bandeja: BandejaNotificacionesService,
    private readonly dialog: MatDialog, private readonly api: SolicitudAutorizacionService,
    private readonly realtime: SolicitudesAutorizacionRealtimeService, private readonly texts: TenantTextCatalogService,
    private readonly router: Router) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.subscribe(params => {
      this.id = params.get('id') ?? '';
      void this.cargar();
    });
  }

  ngOnDestroy(): void { this.id = ''; this.subscription?.unsubscribe(); }

  async cargar(): Promise<void> {
    const id = this.id;
    this.cargando = true;
    this.error = false;
    this.detalle = null;
    try {
      const detalle = await this.bandeja.detalle(id);
      if (this.id !== id) return;
      this.detalle = detalle;
      this.errorLectura = false;
      try { await this.bandeja.marcarLeida(id); }
      catch { this.errorLectura = true; }
      if (detalle.LibroReclamacion) {
        await this.router.navigate(['/administracion'], {
          queryParams: { 'libro-reclamacion': detalle.LibroReclamacion.Codigo },
        });
      }
    } catch { if (this.id === id) this.error = true; }
    finally { if (this.id === id) this.cargando = false; }
  }

  abrirBandeja(): void {
    this.dialog.open(DialogSolicitudesAutorizacionComponent, {
      width: 'min(760px, 96vw)', maxWidth: '96vw', panelClass: 'dialog-window--compact',
    });
  }

  revisarStock(): void {
    const idsArticulos = this.detalle?.Stock?.Alertas.map(a => a.IdArticulo) ?? [];
    if (!idsArticulos.length) return;
    this.dialog.open(StockAlmacenConsultaComponent, {
      width: 'calc(100vw - 32px)', maxWidth: '1240px', height: 'calc(100vh - 32px)', maxHeight: '880px',
      panelClass: 'dialog-window--workspace', data: { idsArticulos },
    });
  }

  revisarComprobante(): void {
    const comprobante = this.detalle?.Comprobante;
    if (!comprobante) return;
    this.dialog.open(DialogComprobantesFiscalesPendientesComponent, {
      width: 'min(760px, 96vw)', maxWidth: '96vw', data: { idVenta: comprobante.IdVenta, idRegistroFiscal: comprobante.IdRegistroFiscal },
    });
  }

  async resolver(aprobar: boolean): Promise<void> {
    const solicitud = this.detalle?.Solicitud;
    if (!solicitud || !this.detalle?.PuedeResolverSolicitud || this.procesando) return;
    this.procesando = true;
    try {
      let motivo: string | null = null;
      if (!aprobar) {
        const respuesta = await firstValueFrom(this.dialog.open(DialogMTextComponent, {
          width: 'min(800px, 96vw)', data: { title: this.texts.get('denyReasonTitle') },
        }).afterClosed());
        if (!respuesta) return;
        motivo = (respuesta.value ?? '').trim() || null;
      }
      const resultado = await firstValueFrom(aprobar ? this.api.aprobar(solicitud.IdSolicitud) : this.api.denegar(solicitud.IdSolicitud, motivo));
      this.realtime.quitar(solicitud.IdSolicitud);
      Notificar.informacion(this.texts.get(resultado.Estado === 'Aprobada' ? 'requestApproved' : resultado.Estado === 'Denegada' ? 'requestDenied' : 'requestWithoutEffect'));
      await this.cargar();
    } catch { await this.cargar(); }
    finally { this.procesando = false; }
  }
}
