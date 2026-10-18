import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { CobroOnlineSinPedido } from 'src/app/models/cobros-online-sin-pedido.models';
import { CobrosOnlineSinPedidoService } from 'src/app/services/cobros-online-sin-pedido.service';
import { Notificar } from 'src/app/shared/notificaciones';

interface CuentaDestino {
  idPedido: number | null;
  nroCuenta: number | null;
}

/**
 * Bandeja de caja para resolver un pago confirmado que no pudo asociarse al
 * carrito QR. No hace devoluciones automáticas: el cajero decide si lo aplica
 * a una cuenta real o solicita la devolución.
 */
@Component({
  selector: 'app-dialog-conciliar-cobros-online',
  templateUrl: './dialog-conciliar-cobros-online.component.html',
  styleUrls: ['./dialog-conciliar-cobros-online.component.css'],
})
export class DialogConciliarCobrosOnlineComponent implements OnInit {
  cobros: CobroOnlineSinPedido[] = [];
  cargando = false;
  private readonly procesando = new Set<string>();
  private readonly cuentasDestino = new Map<string, CuentaDestino>();

  constructor(
    private readonly service: CobrosOnlineSinPedidoService,
    private readonly dialogRef: MatDialogRef<DialogConciliarCobrosOnlineComponent>,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.listar()
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: response => {
          this.cobros = response.Data ?? [];
          this.sincronizarBorradores();
        },
        error: error => Notificar.error(
          'No se pudo cargar la bandeja de conciliación.',
          error?.error?.Message,
        ),
      });
  }

  destino(cobro: CobroOnlineSinPedido): CuentaDestino {
    let destino = this.cuentasDestino.get(cobro.IdIntento);
    if (!destino) {
      destino = { idPedido: null, nroCuenta: 1 };
      this.cuentasDestino.set(cobro.IdIntento, destino);
    }
    return destino;
  }

  puedeConciliar(cobro: CobroOnlineSinPedido): boolean {
    return cobro.Estado === 'Pagado';
  }

  estaProcesando(cobro: CobroOnlineSinPedido): boolean {
    return this.procesando.has(cobro.IdIntento);
  }

  async solicitarDevolucion(cobro: CobroOnlineSinPedido): Promise<void> {
    if (!this.puedeConciliar(cobro) || this.estaProcesando(cobro)) return;

    const confirmar = await Notificar.confirmar({
      titulo: '¿Solicitar devolución?',
      detalle: `Se solicitará al proveedor devolver ${cobro.Moneda} ${cobro.Importe.toFixed(2)}. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Solicitar devolución',
      textoCancelar: 'Volver',
    });
    if (!confirmar) return;

    this.procesando.add(cobro.IdIntento);
    this.service.solicitarDevolucion(cobro.IdIntento)
      .pipe(finalize(() => this.procesando.delete(cobro.IdIntento)))
      .subscribe({
        next: response => {
          const actualizado = response.Data;
          if (actualizado?.Estado === 'DevolucionSolicitada') {
            Notificar.exito('Devolución solicitada', 'El proveedor procesará el abono según sus plazos.');
          } else {
            Notificar.advertencia(
              'No se pudo confirmar la devolución',
              actualizado?.ErrorDevolucion || 'Revisa el cobro con Culqi antes de intentar otra acción.',
            );
          }
          this.cargar();
        },
        error: error => Notificar.error(
          'No se pudo solicitar la devolución.',
          error?.error?.Message,
        ),
      });
  }

  vincularComoPagoCuenta(cobro: CobroOnlineSinPedido): void {
    if (!this.puedeConciliar(cobro) || this.estaProcesando(cobro)) return;

    const destino = this.destino(cobro);
    if (!Number.isInteger(destino.idPedido) || (destino.idPedido ?? 0) <= 0
      || !Number.isInteger(destino.nroCuenta) || (destino.nroCuenta ?? 0) <= 0) {
      void Notificar.advertencia(
        'Indica la cuenta destino',
        'Registra primero el pedido y luego escribe su ID y número de cuenta.',
      );
      return;
    }

    this.procesando.add(cobro.IdIntento);
    this.service.vincularComoPagoCuenta(cobro.IdIntento, {
      IdPedido: destino.idPedido!,
      NroCuenta: destino.nroCuenta!,
    })
      .pipe(finalize(() => this.procesando.delete(cobro.IdIntento)))
      .subscribe({
        next: () => {
          Notificar.exito(
            'Pago a cuenta conciliado',
            'El cobro se incluirá al emitir el comprobante de esa cuenta.',
          );
          this.cargar();
        },
        error: error => Notificar.error(
          'No se pudo aplicar el pago a cuenta.',
          error?.error?.Message,
        ),
      });
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      Pagado: 'Pendiente de conciliación',
      DevolucionEnProceso: 'Devolución en proceso',
      DevolucionSolicitada: 'Devolución solicitada',
      DevolucionFallida: 'Revisión con el proveedor requerida',
    };
    return etiquetas[estado] ?? estado;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private sincronizarBorradores(): void {
    const idsActivos = new Set(this.cobros.map(cobro => cobro.IdIntento));
    Array.from(this.cuentasDestino.keys())
      .filter(id => !idsActivos.has(id))
      .forEach(id => this.cuentasDestino.delete(id));
  }
}
