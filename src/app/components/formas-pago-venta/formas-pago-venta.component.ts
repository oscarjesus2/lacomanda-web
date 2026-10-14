import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BancoMantenimientoComponent } from 'src/app/components/mantenimiento/banco-mantenimiento/banco-mantenimiento.component';
import { PagoCorreccionVenta, PreparacionCorreccionVenta } from 'src/app/interfaces/correccion-venta.interface';
import { Moneda } from 'src/app/models/moneda.models';
import { Tarjeta } from 'src/app/models/tarjeta.models';
import { MonedaService } from 'src/app/services/moneda.service';
import { TarjetaService } from 'src/app/services/tarjeta.service';

/** Editor reutilizable de formas de pago durante la modificación de comprobantes. */
@Component({
  selector: 'app-formas-pago-venta',
  templateUrl: './formas-pago-venta.component.html',
})
export class FormasPagoVentaComponent implements OnChanges {
  @Input() preparacion: PreparacionCorreccionVenta | null = null;
  @Input() pagos: PagoCorreccionVenta[] = [];
  @Input() agregarFormaInicial = false;
  @Input() mostrarValidaciones = false;

  tarjetas: Tarjeta[] = [];
  monedas: Moneda[] = [];
  monedaDocumento = '';

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
    private readonly tarjetaService: TarjetaService,
    private readonly monedaService: MonedaService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['preparacion'] && this.preparacion) {
      this.monedaDocumento = this.preparacion.IdMoneda;
      this.cargarCatalogos(this.preparacion.PaisISO2);
    }
  }

  get totalPagos(): number {
    return this.pagos.reduce(
      (total, pago) => total + Number(pago.MontoPagado || 0)
        - (pago.IdTipoPago === 1 ? Number(pago.Vuelto || 0) : 0)
        + (pago.IdTipoPago === 3 ? Number(pago.Propina || 0) : 0),
      0,
    );
  }

  get diferenciaPagos(): number {
    return Number(((this.preparacion?.Total ?? 0) - this.totalPagos).toFixed(2));
  }

  get saldoPagos(): number {
    return Math.abs(this.diferenciaPagos);
  }

  get claveErrorValidacion():
    | 'paymentDataRequired'
    | 'paymentAmountMismatch'
    | 'cardPaymentDetailsRequired'
    | 'transferPaymentDetailsRequired'
    | null {
    if (!this.preparacion || this.pagos.length === 0) {
      return 'paymentDataRequired';
    }

    if (Math.abs(this.diferenciaPagos) > 0.01) {
      return 'paymentAmountMismatch';
    }

    if (this.pagos.some(pago => pago.IdTipoPago === 6
        && (!pago.Observacion?.trim() || !pago.IdBanco))) {
      return 'transferPaymentDetailsRequired';
    }

    if (this.pagos.some(pago => pago.IdTipoPago === 3
        && (!pago.IdTarjeta || !pago.Autorizacion?.trim()))) {
      return 'cardPaymentDetailsRequired';
    }

    if (this.pagos.some(pago =>
      pago.IdTipoPago <= 0
      || !pago.IdMoneda
      || Number(pago.MontoRecibido) <= 0
      || Number(pago.TipoCambio) <= 0
      || Number(pago.MontoPagado) <= 0
      || (pago.IdTipoPago === 1
        && Number(pago.Vuelto || 0) >= Number(pago.MontoPagado)))) {
      return 'paymentDataRequired';
    }

    return null;
  }

  get puedeGuardar(): boolean {
    return this.claveErrorValidacion === null;
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
      IdMoneda: this.monedaDocumento,
    });
    this.recalcularVueltos();
  }

  eliminarPago(index: number): void {
    this.pagos.splice(index, 1);
    this.recalcularVueltos();
  }

  cambiarMoneda(pago: PagoCorreccionVenta): void {
    if (this.esMonedaDocumento(pago)) pago.TipoCambio = 1;
    this.actualizarMontoRecibido(pago, pago.MontoRecibido ?? 0);
  }

  actualizarMontoRecibido(pago: PagoCorreccionVenta, monto: number | string | null): void {
    pago.MontoRecibido = Number(monto || 0);
    this.actualizarEquivalente(pago);
  }

  actualizarTipoCambio(pago: PagoCorreccionVenta, tipoCambio: number | string | null): void {
    pago.TipoCambio = this.esMonedaDocumento(pago) ? 1 : Number(tipoCambio || 0);
    this.actualizarEquivalente(pago);
  }

  cambiarFormaPago(pago: PagoCorreccionVenta): void {
    if (pago.IdTipoPago !== 1) pago.Vuelto = 0;
    if (pago.IdTipoPago !== 3) pago.Propina = 0;
    if (pago.IdTipoPago !== 3) {
      pago.IdTarjeta = undefined;
      pago.Autorizacion = undefined;
    }
    if (pago.IdTipoPago !== 6) {
      pago.Observacion = undefined;
      pago.IdBanco = undefined;
    }
    this.recalcularVueltos();
  }

  asignarBanco(pago: PagoCorreccionVenta, idBanco: number | null): void {
    const valorNormalizado = Number(idBanco);
    pago.IdBanco = Number.isInteger(valorNormalizado) && valorNormalizado > 0
      ? valorNormalizado
      : undefined;
  }

  abrirMantenimientoBancos(): void {
    this.dialog.open(BancoMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '860px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 32px)',
      panelClass: 'dialog-window--maintenance-table',
    });
  }

  esMonedaDocumento(pago: PagoCorreccionVenta): boolean {
    return pago.IdMoneda === this.monedaDocumento;
  }

  normalizarParaSolicitud(): PagoCorreccionVenta[] {
    this.recalcularVueltos();
    return this.pagos.map(pago => ({
      ...pago,
      Vuelto: pago.IdTipoPago === 1 ? Number(pago.Vuelto || 0) : 0,
      Propina: pago.IdTipoPago === 3 ? Number(pago.Propina || 0) : 0,
      Observacion: pago.Observacion?.trim() || undefined,
      IdBanco: pago.IdBanco || undefined,
    }));
  }

  private cargarCatalogos(paisISO2: string): void {
    this.tarjetaService.getTarjeta().subscribe({
      next: tarjetas => this.tarjetas = tarjetas ?? [],
      error: () => this.tarjetas = [],
    });
    this.monedaService.getMonedaPorPais(paisISO2).subscribe({
      next: response => {
        this.monedas = (response?.Data ?? []).filter(moneda => !!moneda.IdMoneda);
        if (!this.monedaDocumento) this.monedaDocumento = this.monedas[0]?.IdMoneda ?? '';
        this.completarPagosIniciales();
      },
      error: () => this.completarPagosIniciales(),
    });
  }

  private completarPagosIniciales(): void {
    this.pagos.forEach(pago => {
      pago.IdMoneda = pago.IdMoneda || this.monedaDocumento;
      pago.TipoCambio = pago.TipoCambio && pago.TipoCambio > 0 ? pago.TipoCambio : 1;
      pago.MontoRecibido = pago.MontoRecibido && pago.MontoRecibido > 0
        ? pago.MontoRecibido : pago.MontoPagado;
      if (pago.IdTipoPago !== 3) pago.Propina = 0;
    });
    if (this.pagos.length === 0 && this.agregarFormaInicial) this.agregarPago();
    this.recalcularVueltos();
  }

  private actualizarEquivalente(pago: PagoCorreccionVenta): void {
    const tipoCambio = this.esMonedaDocumento(pago) ? 1 : Number(pago.TipoCambio || 0);
    pago.TipoCambio = tipoCambio;
    pago.MontoPagado = tipoCambio > 0
      ? Number((Number(pago.MontoRecibido || 0) * tipoCambio).toFixed(2)) : 0;
    this.recalcularVueltos();
  }

  private recalcularVueltos(): void {
    if (!this.preparacion) return;
    this.pagos.forEach(pago => pago.Vuelto = 0);
    const totalVenta = Number(this.preparacion.Total || 0);
    const totalNoEfectivo = this.pagos.filter(pago => pago.IdTipoPago !== 1)
      .reduce((total, pago) => total + Number(pago.MontoPagado || 0), 0);
    if (totalNoEfectivo > totalVenta) return;
    const totalEfectivo = this.pagos.filter(pago => pago.IdTipoPago === 1)
      .reduce((total, pago) => total + Number(pago.MontoPagado || 0), 0);
    let vueltoPendiente = Math.max(totalEfectivo - Math.max(totalVenta - totalNoEfectivo, 0), 0);
    for (let indice = this.pagos.length - 1; indice >= 0 && vueltoPendiente > 0; indice -= 1) {
      const pago = this.pagos[indice];
      if (pago.IdTipoPago !== 1) continue;
      const vuelto = Math.min(vueltoPendiente, Number(pago.MontoPagado || 0));
      pago.Vuelto = Number(vuelto.toFixed(2));
      vueltoPendiente = Number((vueltoPendiente - vuelto).toFixed(2));
    }
  }
}
