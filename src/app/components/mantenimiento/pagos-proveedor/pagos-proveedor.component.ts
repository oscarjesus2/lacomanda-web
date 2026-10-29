import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  EntradaCompra,
  EntradaCompraOpcionEntera,
  PagoProveedor,
  PagoProveedorGuardar,
} from 'src/app/models/entrada-compra.models';
import { EntradaCompraService } from 'src/app/services/entrada-compra.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-pagos-proveedor',
  templateUrl: './pagos-proveedor.component.html',
})
export class PagosProveedorComponent implements OnInit {
  compra: EntradaCompra | null = null;
  tiposPago: EntradaCompraOpcionEntera[] = [];
  pago: PagoProveedorGuardar = this.pagoInicial();
  fechaPagoProgramada: Date | null = null;
  cargando = true;
  guardando = false;
  private cambios = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: { idEntrada: number },
    private readonly dialogRef: MatDialogRef<PagosProveedorComponent>,
    private readonly entradaCompraService: EntradaCompraService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      compra: this.entradaCompraService.obtener(this.data.idEntrada),
      catalogos: this.entradaCompraService.catalogos(),
    }).subscribe({
      next: respuesta => {
        this.cargando = false;
        if (!respuesta.compra.Success || !respuesta.compra.Data ||
            !respuesta.catalogos.Success || !respuesta.catalogos.Data) {
          Swal.fire('No se pudo abrir', respuesta.compra.Message ||
            respuesta.catalogos.Message || 'No se pudieron cargar los pagos.', 'error');
          return;
        }
        this.tiposPago = respuesta.catalogos.Data.TiposPago || [];
        this.actualizarCompra(respuesta.compra.Data);
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar los pagos.');
      },
    });
  }

  get totalPagado(): number {
    return this.redondear((this.compra?.PagosProveedor || [])
      .reduce((total, pago) => total + pago.MontoPagado, 0));
  }

  get saldoPendiente(): number {
    return this.redondear(Math.max(0,
      (this.compra?.TotalNetoPagar ?? this.compra?.TotalCompra ?? 0) - this.totalPagado));
  }

  registrarPago(): void {
    if (!this.compra || !this.pago.IdTipoPago || this.pago.MontoPagado <= 0) {
      Swal.fire('Faltan datos', 'Seleccione la forma de pago e indique un importe.', 'info');
      return;
    }
    this.guardando = true;
    this.entradaCompraService.registrarPagoProveedor(this.compra.IdEntrada, this.pago)
      .subscribe({
        next: respuesta => {
          this.guardando = false;
          if (!respuesta.Success || !respuesta.Data) {
            Swal.fire('No se pudo registrar el pago', respuesta.Message || 'Revise los datos indicados.', 'error');
            return;
          }
          this.cambios = true;
          this.actualizarCompra(respuesta.Data);
          Notificar.exito('Pago registrado', '');
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo registrar el pago.');
        },
      });
  }

  async eliminarPago(pago: PagoProveedor): Promise<void> {
    if (!this.compra || this.guardando) return;
    const resultado = await Swal.fire({
      title: 'Eliminar pago',
      text: 'El saldo y el estado de pago se recalcularán automáticamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-button--danger' },
    });
    if (!resultado.isConfirmed || !this.compra || this.guardando) return;
    this.guardando = true;
    this.entradaCompraService.eliminarPagoProveedor(this.compra.IdEntrada, pago.IdPagoProveedor)
      .subscribe({
        next: respuesta => {
          this.guardando = false;
          if (!respuesta.Success || !respuesta.Data) {
            Swal.fire('No se pudo eliminar', respuesta.Message || 'No se pudo eliminar el pago.', 'error');
            return;
          }
          this.cambios = true;
          this.actualizarCompra(respuesta.Data);
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo eliminar el pago.');
        },
      });
  }

  reprogramarPago(): void {
    if (!this.compra || !this.fechaPagoProgramada || this.guardando) return;
    this.guardando = true;
    this.entradaCompraService.reprogramarPagoProveedor(this.compra.IdEntrada, this.fechaPagoProgramada)
      .subscribe({
        next: respuesta => {
          this.guardando = false;
          if (!respuesta.Success || !respuesta.Data) {
            Swal.fire('No se pudo actualizar', respuesta.Message || 'Revise la fecha indicada.', 'error');
            return;
          }
          this.cambios = true;
          this.actualizarCompra(respuesta.Data);
          Notificar.exito('Fecha de pago actualizada', '');
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo actualizar la fecha.');
        },
      });
  }

  cerrar(): void {
    if (!this.guardando) this.dialogRef.close(this.cambios);
  }

  private actualizarCompra(compra: EntradaCompra): void {
    this.compra = compra;
    this.fechaPagoProgramada = compra.FechaPagoProgramada
      ? new Date(compra.FechaPagoProgramada) : null;
    this.pago = this.pagoInicial();
    this.pago.IdMoneda = compra.IdMoneda;
    this.pago.MontoPagado = this.saldoPendiente;
    this.pago.IdTipoPago = this.tiposPago[0]?.Id ?? null;
  }

  private pagoInicial(): PagoProveedorGuardar {
    return {
      FechaPago: new Date(), IdTipoPago: null, IdMoneda: '',
      IdBancoOrigen: null, IdBancoDestino: null, MontoPagado: 0,
      Referencia: '', Observacion: '',
    };
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire('Error', error?.error?.Message || error?.error?.message || error?.message || fallback, 'error');
  }
}
