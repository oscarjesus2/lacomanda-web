import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';

import { CajaDto } from 'src/app/models/caja.models';
import { Turno } from 'src/app/models/turno.models';
import { CajaService } from 'src/app/services/caja.service';
import { TurnoService } from 'src/app/services/turno.service';
import { StorageService } from 'src/app/services/storage.service';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { CerrarTurnoRequest, CerrarTurnoResult, VentaSinPago } from 'src/app/interfaces/cerrarTurno.interface';
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

  constructor(
    public dialogRef: MatDialogRef<DialogCerrarTurnoComponent>,
    private cajaService: CajaService,
    private turnoService: TurnoService,
    private storageService: StorageService,
    private spinner: NgxSpinnerService,
    private qzTrayService: QzTrayV224Service
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
    this.turnoService.CerrarTurno(request).subscribe({
      next: (r) => {
        this.spinner.hide();
        this.procesando = false;
        const data = r?.Data;
        if (!r?.Success || !data) {
          Swal.fire('Error', r?.Message || 'No se pudo cerrar el turno.', 'error');
          return;
        }

        // El backend se detuvo esperando confirmación de ventas al crédito.
        if (data.RequiereConfirmacionCredito) {
          this.confirmarVentasCredito(data.VentasSinPago);
          return;
        }

        if (data.Cerrado) {
          this.cerrado = true;
          this.imprimir(data.Impresiones);
          Swal.fire('Cierre de turno', data.Mensaje || 'El turno se cerró correctamente.', 'success');
        } else {
          Swal.fire('Cierre de turno', data.Mensaje || 'No se pudo cerrar el turno.', 'warning');
        }
      },
      error: (e) => {
        this.spinner.hide();
        this.procesando = false;
        Swal.fire('Error', e?.error?.Message || 'Ocurrió un error al cerrar el turno.', 'error');
      }
    });
  }

  private confirmarVentasCredito(ventas: VentaSinPago[]): void {
    const filas = (ventas ?? []).map(v => {
      const doc = v.NumDocumento || [v.Serie, v.NroDoc].filter(Boolean).join('-') || `Venta ${v.IdVenta ?? ''}`;
      const total = v.Total != null ? v.Total.toFixed(2) : '';
      return `<tr><td style="text-align:left;padding:2px 8px;">${doc}</td><td style="text-align:right;padding:2px 8px;">${total}</td></tr>`;
    }).join('');

    Swal.fire({
      title: 'Ventas sin pago registrado',
      html: `
        <p>Existen ventas sin pago registrado. ¿Son ventas al crédito?</p>
        <table style="margin:8px auto;border-collapse:collapse;font-size:13px;">
          <thead><tr><th style="text-align:left;padding:2px 8px;">Documento</th><th style="text-align:right;padding:2px 8px;">Total</th></tr></thead>
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

  private async imprimir(impresiones: ImpresionDTO[]): Promise<void> {
    for (const element of impresiones ?? []) {
      await this.qzTrayService.printPDF(element.Documento, element.NombreImpresora);
    }
  }

  salir(): void {
    this.dialogRef.close();
  }
}
