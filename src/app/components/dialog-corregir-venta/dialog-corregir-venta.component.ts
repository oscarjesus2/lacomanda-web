import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  ClienteCorreccionVenta,
  PagoCorreccionVenta,
  PreparacionCorreccionVenta,
  SolicitudCorreccionVenta,
  TipoCorreccionVenta,
} from 'src/app/interfaces/correccion-venta.interface';
import { Tarjeta } from 'src/app/models/tarjeta.models';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { TarjetaService } from 'src/app/services/tarjeta.service';
import {
  TipoIdentidadPaisService,
  TipoIdentidadPaisVM,
} from 'src/app/services/tipo-identidad-pais.service';
import { VentaService } from 'src/app/services/venta.service';
import Swal from 'sweetalert2';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-dialog-corregir-venta',
  templateUrl: './dialog-corregir-venta.component.html',
})
export class DialogCorregirVentaComponent implements OnInit {
  readonly tipoPagos = TipoCorreccionVenta.Pagos;
  readonly tipoCliente = TipoCorreccionVenta.Cliente;
  readonly tipoDocumento = TipoCorreccionVenta.TipoDocumento;

  preparacion: PreparacionCorreccionVenta | null = null;
  tipoCorreccion = TipoCorreccionVenta.Pagos;
  pagos: PagoCorreccionVenta[] = [];
  cliente: ClienteCorreccionVenta = this.clienteVacio();
  tiposIdentidad: TipoIdentidadPaisVM[] = [];
  tarjetas: Tarjeta[] = [];
  idTipoDocumentoDestino?: number;
  documentoOtorgado = true;
  motivo = '';
  cargando = true;
  guardando = false;
  intentoRevisar = false;

  readonly formasPago = [
    { id: 1, key: 'cash' as const },
    { id: 2, key: 'voucher' as const },
    { id: 3, key: 'card' as const },
    { id: 4, key: 'courtesy' as const },
    { id: 5, key: 'cheque' as const },
    { id: 6, key: 'deposit' as const },
    { id: 7, key: 'commission' as const },
  ];

  constructor(
    private readonly ventaService: VentaService,
    private readonly tarjetaService: TarjetaService,
    private readonly tipoIdentidadService: TipoIdentidadPaisService,
    private readonly texts: TenantTextCatalogService,
    private readonly dialogRef: MatDialogRef<DialogCorregirVentaComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: { idVenta: number },
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get documentosDestino() {
    return (this.preparacion?.TiposDocumentoDestino ?? [])
      .filter(documento =>
        documento.IdTipoDocumento !== this.preparacion?.IdTipoDocumento);
  }

  get tiposIdentidadDisponibles(): TipoIdentidadPaisVM[] {
    if (!this.requiereIdentidadFiscal()) {
      return this.tiposIdentidad;
    }

    return this.tiposIdentidad.filter(tipo => tipo.RequiereParaFactura);
  }

  get errorIdentificacionCliente(): string | null {
    if (this.tipoCorreccion === TipoCorreccionVenta.Pagos) {
      return null;
    }

    const tipo = this.tiposIdentidad.find(item =>
      item.IdTipoIdentidad === this.cliente.IdTipoIdentidad);
    if (!tipo) {
      return this.texts.get('correctionIdentityTypeRequired');
    }

    if (this.requiereIdentidadFiscal() && !tipo.RequiereParaFactura) {
      return this.texts.get('correctionIdentityTypeNotValidForInvoice');
    }

    const numero = this.cliente.NumeroIdentificacion?.trim() ?? '';
    if (!numero) {
      return this.requiereIdentidadFiscal() || !!tipo.RegexValidacion
        ? this.texts.get('correctionIdentityNumberRequired')
        : null;
    }

    if (!tipo.RegexValidacion) {
      return null;
    }

    try {
      return new RegExp(tipo.RegexValidacion).test(numero)
        ? null
        : this.texts.get(
          'correctionIdentityNumberInvalid',
          { type: tipo.Abreviatura || tipo.Descripcion },
        );
    } catch {
      return null;
    }
  }

  get patronIdentificacionCliente(): string | null {
    return this.tiposIdentidad.find(item =>
      item.IdTipoIdentidad === this.cliente.IdTipoIdentidad)
      ?.RegexValidacion ?? null;
  }

  get esPeruOnline(): boolean {
    return this.preparacion?.PaisISO2 === 'PE'
      && this.preparacion.EnvioElectronicoOnline;
  }

  get totalPagos(): number {
    return this.pagos.reduce(
      (total, pago) => total + Number(pago.MontoPagado || 0)
        - (pago.IdTipoPago === 1 ? Number(pago.Vuelto || 0) : 0),
      0,
    );
  }

  get diferenciaPagos(): number {
    return Number(((this.preparacion?.Total ?? 0) - this.totalPagos).toFixed(2));
  }

  get saldoPagos(): number {
    return Math.abs(this.diferenciaPagos);
  }

  get puedeRevisar(): boolean {
    if (!this.preparacion || this.cargando || this.guardando
        || this.motivo.trim().length < 3) {
      return false;
    }

    if (this.tipoCorreccion === TipoCorreccionVenta.Pagos) {
      return this.pagos.length > 0
        && Math.abs(this.diferenciaPagos) <= 0.01
        && this.pagos.every(pago =>
          pago.IdTipoPago > 0
          && Number(pago.MontoPagado) > 0
          && (pago.IdTipoPago !== 1
            || Number(pago.Vuelto || 0) < Number(pago.MontoPagado))
          && (pago.IdTipoPago !== 3
            || (!!pago.IdTarjeta && !!pago.Autorizacion?.trim())));
    }

    if (!this.cliente.IdTipoIdentidad || !this.cliente.RazonSocial?.trim()) {
      return false;
    }

    if (this.errorIdentificacionCliente) {
      return false;
    }

    return this.tipoCorreccion !== TipoCorreccionVenta.TipoDocumento
      || !!this.idTipoDocumentoDestino;
  }

  cambiarTipoCorreccion(): void {
    if (this.tipoCorreccion === TipoCorreccionVenta.TipoDocumento
        && !this.idTipoDocumentoDestino) {
      this.idTipoDocumentoDestino =
        this.documentosDestino[0]?.IdTipoDocumento;
    }

    this.ajustarTipoIdentidadAlDocumento();
  }

  cambiarDocumentoDestino(): void {
    this.ajustarTipoIdentidadAlDocumento();
  }

  agregarPago(): void {
    const restante = Math.max(this.diferenciaPagos, 0);
    this.pagos.push({
      Estado: 1,
      IdTurno: this.preparacion?.IdTurno ?? 0,
      Vuelto: 0,
      Propina: 0,
      MontoVenta: this.preparacion?.Total ?? 0,
      MontoPagado: restante,
      MontoRecibido: restante,
      TipoCambio: 1,
      IdTipoPago: 1,
      IdVenta: 0,
      IdPago: 0,
      IdMoneda: this.pagos[0]?.IdMoneda
        ?? this.preparacion?.Pagos[0]?.IdMoneda
        ?? '',
    });
    this.recalcularVueltos();
  }

  eliminarPago(index: number): void {
    this.pagos.splice(index, 1);
    this.recalcularVueltos();
  }

  actualizarMontoPago(
    pago: PagoCorreccionVenta,
    monto: number | string | null,
  ): void {
    pago.MontoPagado = Number(monto || 0);
    pago.MontoRecibido = pago.TipoCambio && pago.TipoCambio > 0
      ? Number((pago.MontoPagado / pago.TipoCambio).toFixed(2))
      : pago.MontoPagado;
    pago.TipoCambio = pago.TipoCambio && pago.TipoCambio > 0
      ? pago.TipoCambio
      : 1;
    this.recalcularVueltos();
  }

  cambiarFormaPago(pago: PagoCorreccionVenta): void {
    if (pago.IdTipoPago !== 1) {
      pago.Vuelto = 0;
    }

    if (pago.IdTipoPago !== 3) {
      pago.IdTarjeta = undefined;
      pago.Autorizacion = undefined;
    }

    this.recalcularVueltos();
  }

  recalcularVueltos(): void {
    if (!this.preparacion) {
      return;
    }

    this.pagos.forEach(pago => {
      pago.Vuelto = 0;
    });

    const totalVenta = Number(this.preparacion.Total || 0);
    const totalNoEfectivo = this.pagos
      .filter(pago => pago.IdTipoPago !== 1)
      .reduce(
        (total, pago) => total + Number(pago.MontoPagado || 0),
        0,
      );

    if (totalNoEfectivo > totalVenta) {
      return;
    }

    const totalEfectivo = this.pagos
      .filter(pago => pago.IdTipoPago === 1)
      .reduce(
        (total, pago) => total + Number(pago.MontoPagado || 0),
        0,
      );
    let vueltoPendiente = Math.max(
      totalEfectivo - Math.max(totalVenta - totalNoEfectivo, 0),
      0,
    );

    for (let index = this.pagos.length - 1;
         index >= 0 && vueltoPendiente > 0;
         index -= 1) {
      const pago = this.pagos[index];
      if (pago.IdTipoPago !== 1) {
        continue;
      }

      const monto = Number(pago.MontoPagado || 0);
      const vuelto = Math.min(vueltoPendiente, monto);
      pago.Vuelto = Number(vuelto.toFixed(2));
      vueltoPendiente = Number((vueltoPendiente - vuelto).toFixed(2));
    }
  }

  revisarYAplicar(): void {
    this.intentoRevisar = true;

    if (this.motivo.trim().length < 3) {
      Swal.fire(
        this.texts.get('validation'),
        this.texts.get('correctionReasonRequired'),
        'warning',
      );
      return;
    }

    if (this.tipoCorreccion !== TipoCorreccionVenta.Pagos
        && this.errorIdentificacionCliente) {
      Swal.fire(
        this.texts.get('validation'),
        this.errorIdentificacionCliente,
        'warning',
      );
      return;
    }

    if (!this.puedeRevisar || !this.preparacion) {
      Swal.fire(
        this.texts.get('validation'),
        this.tipoCorreccion === TipoCorreccionVenta.Pagos
          ? this.texts.get('correctionCompleteRequiredFields')
          : this.texts.get('correctionCustomerRequiredFields'),
        'warning',
      );
      return;
    }

    const solicitud = this.crearSolicitud();
    this.guardando = true;
    this.ventaService
      .planificarCorreccionVenta(this.preparacion.IdVenta, solicitud)
      .subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success) {
            return;
          }

          const plan = response.Data;
          const confirmacion = this.obtenerConfirmacion(
            plan.TipoCorreccion,
          );
          Swal.fire({
            title: confirmacion.titulo,
            text: confirmacion.mensaje,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: confirmacion.boton,
            cancelButtonText: this.texts.get('cancel'),
          }).then(result => {
            if (!result.isConfirmed) {
              return;
            }

            solicitud.AccionFiscalEsperada = plan.AccionFiscal;
            this.aplicar(solicitud);
          });
        },
        error: () => {
          this.guardando = false;
        },
      });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  private cargar(): void {
    this.ventaService.prepararCorreccionVenta(this.data.idVenta).subscribe({
      next: response => {
        if (!response.Success) {
          this.cargando = false;
          return;
        }

        this.preparacion = response.Data;
        this.pagos = response.Data.Pagos.map(pago => ({
          ...pago,
          Vuelto: pago.IdTipoPago === 1 ? pago.Vuelto : 0,
        }));
        this.cliente = { ...response.Data.Cliente };
        this.idTipoDocumentoDestino =
          this.documentosDestino[0]?.IdTipoDocumento;
        this.cargando = false;
        this.recalcularVueltos();
        this.cargarAuxiliares(response.Data.PaisISO2);
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  private cargarAuxiliares(paisISO2: string): void {
    this.tarjetaService.getTarjeta().subscribe({
      next: tarjetas => {
        this.tarjetas = tarjetas ?? [];
      },
      error: () => {
        this.tarjetas = [];
      },
    });

    this.tipoIdentidadService.byPais(paisISO2).subscribe({
      next: tipos => {
        this.tiposIdentidad = (tipos ?? []).filter(tipo => tipo.Activo);
        this.ajustarTipoIdentidadAlDocumento();
      },
      error: () => {
        this.tiposIdentidad = [];
      },
    });
  }

  private crearSolicitud(): SolicitudCorreccionVenta {
    const solicitud: SolicitudCorreccionVenta = {
      TipoCorreccion: this.tipoCorreccion,
      Motivo: this.motivo.trim(),
      DocumentoOtorgado: this.documentoOtorgado,
    };

    if (this.tipoCorreccion === TipoCorreccionVenta.Pagos) {
      this.recalcularVueltos();
      solicitud.Pagos = this.pagos.map(pago => ({
        ...pago,
        Vuelto: pago.IdTipoPago === 1 ? Number(pago.Vuelto || 0) : 0,
      }));
    } else {
      solicitud.Cliente = { ...this.cliente };
    }

    if (this.tipoCorreccion === TipoCorreccionVenta.TipoDocumento) {
      solicitud.IdTipoDocumentoDestino = this.idTipoDocumentoDestino;
    }

    return solicitud;
  }

  private obtenerConfirmacion(tipo: TipoCorreccionVenta): {
    titulo: string;
    mensaje: string;
    boton: string;
  } {
    switch (tipo) {
      case TipoCorreccionVenta.Pagos:
        return {
          titulo: this.texts.get('confirmPaymentChange'),
          mensaje: this.texts.get('confirmPaymentChangeHint'),
          boton: this.texts.get('applyPaymentChange'),
        };

      case TipoCorreccionVenta.Cliente:
        return {
          titulo: this.texts.get('confirmCustomerCorrection'),
          mensaje: this.texts.get('confirmCustomerCorrectionHint'),
          boton: this.texts.get('applyCorrection'),
        };

      case TipoCorreccionVenta.TipoDocumento:
        return {
          titulo: this.texts.get('confirmDocumentChange'),
          mensaje: this.texts.get('confirmDocumentChangeHint'),
          boton: this.texts.get('applyCorrection'),
        };
    }
  }

  private aplicar(solicitud: SolicitudCorreccionVenta): void {
    if (!this.preparacion) {
      return;
    }

    this.guardando = true;
    this.ventaService
      .aplicarCorreccionVenta(this.preparacion.IdVenta, solicitud)
      .subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success) {
            return;
          }

          // El aviso ya no bloquea, así que el diálogo se cierra en el acto y
          // el toast se ve encima de la pantalla anterior.
          Notificar.exito(
            this.texts.get('correctionApplied'),
            response.Data.Mensaje);
          this.dialogRef.close({
            actualizado: true,
            resultado: response.Data,
          });
        },
        error: () => {
          this.guardando = false;
        },
      });
  }

  requiereIdentidadFiscal(): boolean {
    if (this.tipoCorreccion === TipoCorreccionVenta.Cliente) {
      const idTipoDocumento = this.preparacion?.IdTipoDocumento;
      return idTipoDocumento === 1
        || idTipoDocumento === 6
        || (this.preparacion?.PaisISO2 === 'ES'
          && idTipoDocumento === 5);
    }

    return this.idTipoDocumentoDestino === 1
      || this.idTipoDocumentoDestino === 6;
  }

  private ajustarTipoIdentidadAlDocumento(): void {
    const disponibles = this.tiposIdentidadDisponibles;
    if (disponibles.length === 0
        || disponibles.some(tipo =>
          tipo.IdTipoIdentidad === this.cliente.IdTipoIdentidad)) {
      return;
    }

    this.cliente.IdTipoIdentidad = disponibles[0].IdTipoIdentidad;
    this.cliente.NumeroIdentificacion = '';
  }

  private clienteVacio(): ClienteCorreccionVenta {
    return {
      IdTipoIdentidad: '',
      NumeroIdentificacion: '',
      RazonSocial: '',
      Direccion: '',
      Correo: '',
    };
  }
}
