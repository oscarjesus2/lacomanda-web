import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';

import { CajaDto } from 'src/app/models/caja.models';
import { Turno } from 'src/app/models/turno.models';
import { CajaService } from 'src/app/services/caja.service';
import { TurnoService } from 'src/app/services/turno.service';
import { StorageService } from 'src/app/services/storage.service';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { PedidoService } from 'src/app/services/pedido.service';
import {
  AnularPedidoPendienteRequest,
  CerrarTurnoRequest,
  PedidoPendienteCierre,
  VentaSinPago
} from 'src/app/interfaces/cerrarTurno.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';

@Component({
  selector: 'app-dialog-cerrar-turno',
  templateUrl: './dialog-cerrar-turno.component.html',
  styleUrls: ['./dialog-cerrar-turno.component.css']
})
export class DialogCerrarTurnoComponent implements OnInit {

  listCaja: CajaDto[] = [];
  idCajaSel: number | null = null;

  turno: Turno | null = null;
  fechaCierre = new Date();

  esParcial = false;
  cerrado = false;
  procesando = false;
  pedidosPendientes: PedidoPendienteCierre[] = [];

  constructor(
    public dialogRef: MatDialogRef<DialogCerrarTurnoComponent>,
    private cajaService: CajaService,
    private turnoService: TurnoService,
    private storageService: StorageService,
    private spinner: NgxSpinnerService,
    private qzTrayService: QzTrayV224Service,
    private pedidoService: PedidoService
  ) {}

  ngOnInit(): void {
    this.cargarCajas();
  }

  /** Caja seleccionada (objeto completo). */
  get cajaSel(): CajaDto | undefined {
    return this.listCaja.find(c => c.IdCaja === this.idCajaSel);
  }

  /** El "Cierre parcial" solo aplica si la caja lo permite. */
  get permiteParcial(): boolean {
    return !!this.cajaSel?.PermiteCierreParcial;
  }

  /** Hay un turno abierto (Estado = 1) para cerrar. */
  get turnoAbierto(): boolean {
    return !!this.turno && this.turno.Estado === 1;
  }

  private cargarCajas(): void {
    this.cajaService.getAllCaja(false).subscribe({
      next: (r) => {
        this.listCaja = r?.Data ?? [];
        const cajaInicial =
          this.listCaja.find(caja => caja.TurnoAbierto != null)
          ?? this.listCaja[0];
        if (cajaInicial) {
          this.idCajaSel = cajaInicial.IdCaja;
          this.onCajaChange();
        }
        // Preseleccionar la caja del turno abierto de esta estación, si existe.
        this.preseleccionarCajaActual();
      },
      error: () => {}
    });
  }

  private preseleccionarCajaActual(): void {
    const ip = this.storageService.getCurrentIP();
    if (!ip) { return; }
    this.turnoService.ObtenerTurnoByIP(ip).subscribe({
      next: (r) => {
        const t = r?.Data;
        if (t?.IdCaja) {
          this.idCajaSel = t.IdCaja;
          this.onCajaChange();
        }
      },
      error: () => {}
    });
  }

  /** Al cambiar de caja, carga el turno abierto para mostrar sus datos. */
  onCajaChange(): void {
    this.cerrado = false;
    this.turno = null;
    this.esParcial = false;
    this.pedidosPendientes = [];
    this.fechaCierre = new Date();
    if (this.idCajaSel == null) { return; }

    this.turnoService.ObtenerTurno(String(this.idCajaSel)).subscribe({
      next: (t) => { this.turno = t ?? null; },
      error: () => { this.turno = null; }
    });
  }

  cerrarTurno(): void {
    if (this.idCajaSel == null) {
      Swal.fire('Validación', 'Seleccione una caja.', 'warning');
      return;
    }
    if (!this.turnoAbierto) {
      Swal.fire('Validación', 'No hay un turno abierto para esta caja.', 'info');
      return;
    }
    this.fechaCierre = new Date();
    this.ejecutarCierre(false);
  }

  /** Ejecuta el cierre; si el backend pide confirmar ventas al crédito, reintenta. */
  private ejecutarCierre(confirmarCredito: boolean): void {
    const request: CerrarTurnoRequest = {
      IdCaja: this.idCajaSel!,
      EsParcial: this.esParcial,
      ConfirmarVentasSinPagoComoCredito: confirmarCredito,
      TipoFormato: 0
    };

    this.procesando = true;
    this.spinner.show();

    this.turnoService.CerrarTurno(request)
      .pipe(
        finalize(() => {
          this.spinner.hide();
          this.procesando = false;
        })
      )
      .subscribe({
        next: async (response) => {
          const data = response?.Data;

          if (!response?.Success || !data) {
            Swal.fire(
              'Error',
              response?.Message || 'No se pudo cerrar el turno.',
              'error'
            );
            return;
          }

          /*
           * No es una excepción: el backend devuelve la información necesaria
           * para que el usuario resuelva los pedidos y después reintente.
           */
          if (data.RequiereResolverPedidosPendientes) {
            this.pedidosPendientes = data.PedidosPendientes ?? [];
            return;
          }

          this.pedidosPendientes = [];

          if (data.RequiereConfirmacionCredito) {
            this.confirmarVentasCredito(data.VentasSinPago);
            return;
          }

          if (data.Cerrado) {
            this.cerrado = true;
            await this.imprimir(data.Impresiones);

            Swal.fire(
              'Cierre de turno',
              data.Mensaje || 'El turno se cerró correctamente.',
              'success'
            );
            return;
          }

          Swal.fire(
            'Cierre de turno',
            data.Mensaje || 'No se pudo cerrar el turno.',
            'warning'
          );
        },

        // El interceptor ya clasificó y mostró los errores HTTP.
        error: () => {}
      });
  }

  async anularPedidoPendiente(pedido: PedidoPendienteCierre): Promise<void> {
    const confirmacion = await Swal.fire({
      title: `Anular pedido N.º ${pedido.NroPedido}`,
      text: 'Esta operación anulará el pedido completo y no puede deshacerse.',
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Ingrese el motivo...',
      inputAttributes: {
        maxlength: '120'
      },
      showCancelButton: true,
      confirmButtonText: 'Anular pedido',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'swal-button--danger'
      },
      inputValidator: (valor) =>
        valor?.trim()
          ? null
          : 'Debe ingresar el motivo de la anulación.'
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    const request: AnularPedidoPendienteRequest = {
      IdPedido: pedido.IdPedido,
      NroCuenta: pedido.NroCuenta,
      MotivoAnula: String(confirmacion.value).trim(),
      Ip: this.storageService.getCurrentIP()
    };

    this.procesando = true;
    this.spinner.show();

    this.pedidoService.AnularPedidoPendiente(request)
      .pipe(
        finalize(() => {
          this.spinner.hide();
          this.procesando = false;
        })
      )
      .subscribe({
        next: async (response) => {
          if (!response?.Success) {
            Swal.fire(
              'Error',
              response?.Message || 'No se pudo anular el pedido.',
              'error'
            );
            return;
          }

          await this.imprimir(response.Data ?? []);
          this.pedidosPendientes = this.pedidosPendientes.filter(
            item =>
              item.IdPedido !== pedido.IdPedido
              || item.NroCuenta !== pedido.NroCuenta
          );

          Swal.fire(
            'Pedido anulado',
            response.Message || 'El pedido se anuló correctamente.',
            'success'
          );
        },

        // El interceptor ya clasificó y mostró los errores HTTP.
        error: () => {}
      });
  }

  private confirmarVentasCredito(ventas: VentaSinPago[]): void {
    const filas = (ventas ?? []).map(v => {
      const doc = v.NumDocumento || [v.Serie, v.NroDoc].filter(Boolean).join('-') || `Venta ${v.IdVenta ?? ''}`;
      const total = v.Total != null ? v.Total.toFixed(2) : '';
      return `<tr><td>${this.escapeHtml(doc)}</td><td class="is-numeric">${total}</td></tr>`;
    }).join('');

    Swal.fire({
      title: 'Ventas sin pago registrado',
      html: `
        <p>Existen ventas sin pago registrado. ¿Son ventas al crédito?</p>
        <table class="swal-data-table">
          <thead><tr><th>Documento</th><th class="is-numeric">Total</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, son al crédito',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.ejecutarCierre(true);
      }
    });
  }

  private escapeHtml(value: string): string {
    const characters: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return value.replace(/[&<>"']/g, character => characters[character]);
  }

  private async imprimir(impresiones: ImpresionDTO[]): Promise<void> {
    for (const element of impresiones ?? []) {
      await this.qzTrayService.printPDF(element.Documento, element.NombreImpresora);
    }
  }

  salir(): void {
    if (this.procesando) {
      return;
    }
    this.dialogRef.close();
  }
}
