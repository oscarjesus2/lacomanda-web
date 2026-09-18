import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { VentasDTO } from 'src/app/interfaces/ventas.interface';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import { Moneda } from 'src/app/models/moneda.models';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { StorageService } from 'src/app/services/storage.service';
import { CajaTipoDocumentoService } from 'src/app/services/caja-tipo-documento.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { VentaService } from 'src/app/services/venta.service';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';
import { NivelUsuarioEnum } from 'src/app/enums/enum';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { DialogCorregirVentaComponent } from '../dialog-corregir-venta/dialog-corregir-venta.component';
import { Notificar } from 'src/app/shared/notificaciones';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { ResultadoAnulacionDocumentoVenta } from 'src/app/interfaces/correccion-venta.interface';
import { firstValueFrom } from 'rxjs';
import { ReprintFormatService } from 'src/app/services/reprint-format.service';

@Component({
  selector: 'app-dialog-documentos-emitidos',
  templateUrl: './dialog-documentos-emitidos.component.html',
  styleUrls: ['./dialog-documentos-emitidos.component.css']
})
export class DialogDocumentosEmitidosComponent implements OnInit {

  // ── Filtros ───────────────────────────────────────────────────────────────
  /** Tipos de documento configurados en la caja actual (solo Activo=true) */
  tiposDocumento: CajaTipoDocumento[] = [];
  /** Monedas dinámicas por país (Soles, Dólares, Euros, etc.) */
  monedas: Moneda[] = [];

  /** IdTipoDocumento seleccionado; '' = todos */
  filterTipoId: string    = '';
  filterFormaPago: string = '';
  nroDocumento: string    = '';
  motivoAnulacion: string = '';

  // ── Tabla ─────────────────────────────────────────────────────────────────
  displayedColumns: string[] = ['tipo', 'serie', 'numDoc', 'fecha', 'monto', 'cliente', 'numeroDoi', 'forr', 'estado'];
  dataSource = new MatTableDataSource<VentasDTO>();
  selectedRow: VentasDTO | null = null;
  comprobantesHabilitados = false;
  correccionHabilitada = false;

  get isDocumentoInactivo(): boolean {
    return !!this.selectedRow && this.selectedRow.Estado !== 'Generado';
  }
  idTurno: number;

  constructor(
    private ventaService: VentaService,
    private cajaTipoDocumentoService: CajaTipoDocumentoService,
    private monedaService: MonedaService,
    private configuracionService: ConfiguracionService,
    private spinnerService: NgxSpinnerService,
    private storageService: StorageService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogDocumentosEmitidosComponent>,
    private qzTrayService: QzTrayV224Service,
    private texts: TenantTextCatalogService,
    private licenciaTenantService: LicenciaTenantService,
    private reprintFormat: ReprintFormatService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.idTurno = data.idTurno;
    this.idCaja  = data.idCaja;
  }

  idCaja: number;

  ngOnInit(): void {
    this.licenciaTenantService.obtenerEstado().subscribe(estado => {
      this.comprobantesHabilitados = this.licenciaTenantService.evaluar(
        estado,
        CARACTERISTICAS_LICENCIA.OperacionComprobantes,
      );
      this.correccionHabilitada = this.licenciaTenantService.evaluar(
        estado,
        [
          CARACTERISTICAS_LICENCIA.OperacionComprobantes,
          CARACTERISTICAS_LICENCIA.VentasCorreccionDocumentos,
        ],
      );
    });
    this.loadTiposDocumento();
    this.loadMonedas();
    this.getVentasPorTurno(this.idTurno);
  }

  // ── Tipos de documento de la caja ────────────────────────────────────────

  loadTiposDocumento(): void {
    this.cajaTipoDocumentoService.GetTiposDocumentos(this.idCaja).subscribe({
      next: (docs) => {
        // Solo mostrar los tipos activos configurados en esta caja
        this.tiposDocumento = (docs ?? []).filter(d => d.Activo);
      },
      error: () => { this.tiposDocumento = []; }
    });
  }

  // ── Monedas por país ──────────────────────────────────────────────────────

  loadMonedas(): void {
    this.configuracionService.get().subscribe({
      next: (cfg) => {
        const paisISO2 = cfg?.PaisISO2;
        const obs = paisISO2
          ? this.monedaService.getMonedaPorPais(paisISO2)
          : this.monedaService.getMoneda();
        obs.subscribe({
          next: (resp) => { this.monedas = resp?.Data ?? []; },
          error: ()    => { this.monedas = []; }
        });
      },
      error: () => {
        this.monedaService.getMoneda().subscribe({
          next: (resp) => { this.monedas = resp?.Data ?? []; },
          error: ()    => { this.monedas = []; }
        });
      }
    });
  }

  // ── Selección de filtros ──────────────────────────────────────────────────

  selectTipoDoc(tipo: CajaTipoDocumento | null): void {
    this.filterTipoId = tipo ? tipo.IdTipoDocumento.toString() : '';
    this.selectedRow  = null;
    this.applyFilter();
  }

  selectFormaPago(formaPago: string): void {
    this.filterFormaPago = formaPago === 'todos' ? '' : formaPago;
    this.selectedRow     = null;
    this.applyFilter();
  }

  selectCredito(): void {
    // Filtro especial: documentos al crédito (EstadoPago pendiente o similar)
    // Mantener lógica original — se puede extender según el modelo de negocio
    this.filterTipoId    = 'credito';
    this.selectedRow     = null;
    this.applyFilter();
  }

  applyFilter(): void {
    this.dataSource.filterPredicate = (data: VentasDTO) => {
      const tipoMatch = this.filterTipoId === '' ||
                        this.filterTipoId === 'credito'
                          ? true  // crédito: sin filtro de tipo (se filtra por estado si aplica)
                          : data.IdTipoDocumento === this.filterTipoId;

      const pagoMatch = this.filterFormaPago === '' || data.FormaPago === this.filterFormaPago;
      const nroMatch  = this.nroDocumento === ''    || data.NroDoc.includes(this.nroDocumento);
      return tipoMatch && pagoMatch && nroMatch;
    };
    this.dataSource.filter = 'apply';
  }

  onNroDocumentoChange(): void { this.applyFilter(); }

  // ── Datos ─────────────────────────────────────────────────────────────────

  selectRow(row: VentasDTO): void { this.selectedRow = row; }

  getVentasPorTurno(idTurno: number): void {
    this.ventaService.getVentasTurno(idTurno).subscribe((response: ApiResponse<VentasDTO[]>) => {
      if (response.Success) {
        this.dataSource.data = response.Data;
        this.applyFilter();
      } else {
        console.error('Error al obtener los datos', response.Message);
      }
    });
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async imprimir(listImpresionDTO: ImpresionDTO[]): Promise<number> {
    let contador = 0;
    for (const element of listImpresionDTO) {
      const success = await this.qzTrayService.printPDF(element.Documento, element.NombreImpresora);
      if (success) contador++;
    }
    return contador;
  }

  async reImprimirDocumento(): Promise<void> {
    if (!this.selectedRow) { this.alertSeleccione(); return; }
    const idVenta = this.selectedRow.IdVenta;
    const formato = await this.reprintFormat.choose();
    if (formato === null) return;

    this.spinnerService.show();
    try {
      const response: ApiResponse<ImpresionDTO[]> = await firstValueFrom(
        this.ventaService.getImpresionComprobanteVenta(idVenta, formato)
      );
      if (!response.Success) throw new Error(response.Message);

      if (formato === 1) {
        const impresos = await this.imprimir(response.Data);
        if (impresos < response.Data.length) {
          await Swal.fire(this.texts.get('attention'), this.texts.get('reprintFailed'), 'warning');
        }
      } else {
        for (const documento of response.Data) {
          await this.ventaService.showPDF(documento.Documento);
        }
      }
    } catch (error) {
      await Swal.fire(this.texts.get('error'), String(error), 'error');
    } finally {
      this.spinnerService.hide();
    }
  }

  corregirVenta(): void {
    if (!this.selectedRow) {
      this.alertSeleccione();
      return;
    }

    if (this.storageService.getCurrentUser().IdNivel
        !== NivelUsuarioEnum.Administrador) {
      Swal.fire({
        title: this.texts.get('attention'),
        text: this.texts.get('noPermissionEnterAdminKey'),
        icon: 'error',
        confirmButtonText: this.texts.get('ok'),
      });
      return;
    }

    const dialogRef = this.dialog.open(DialogCorregirVentaComponent, {
      width: '92vw',
      maxWidth: '1120px',
      data: { idVenta: this.selectedRow.IdVenta },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.actualizado) {
        this.getVentasPorTurno(this.idTurno);
        this.selectedRow = null;
      }
    });
  }

  anularDocumento(): void {
    if (!this.selectedRow) { this.alertSeleccione(); return; }
    if (!this.motivoAnulacion) {
      Swal.fire({ title: this.texts.get('void'), text: this.texts.get('enterVoidReasonMsg'), icon: 'warning', confirmButtonText: this.texts.get('ok') });
      return;
    }

    // El backend solo permite anular documentos a un administrador.
    if (this.storageService.getCurrentUser().IdNivel !== NivelUsuarioEnum.Administrador) {
      void Notificar.advertencia(this.texts.get('void'), this.texts.get('onlyAdminCanVoidDocuments'));
      return;
    }

    this.confirmarAnulacion(this.selectedRow.IdVenta, this.selectedRow.IdTipoPedido, 0);
  }

  confirmarAnulacion(IntIdVenta: number, idTipoPedido: string, idUsuarioAnula: number): void {
    Swal.fire({ title: this.texts.get('void'), text: this.texts.get('confirmVoidThisDocument'), icon: 'question',
      showCancelButton: true, confirmButtonText: this.texts.get('yes'), cancelButtonText: this.texts.get('no')
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (idTipoPedido === '004') {
        this.anularDocumentoVenta(IntIdVenta, true);
      } else {
        Swal.fire({ title: this.texts.get('voidOrderTitleSimple'), text: this.texts.get('alsoVoidOrder'), icon: 'warning',
          showCancelButton: true, confirmButtonText: this.texts.get('yes'), cancelButtonText: this.texts.get('no')
        }).then(r => this.anularDocumentoVenta(IntIdVenta, r.isConfirmed));
      }
    });
  }

  async anularDocumentoVenta(IntIdVenta: number, anularPedido: boolean): Promise<void> {
    const documentoOtorgado = await this.solicitarEstadoEntregaDocumento();
    if (documentoOtorgado === undefined) {
      return;
    }

    this.spinnerService.show();
    this.ventaService.anularDocumentoVenta(IntIdVenta, {
      Motivo: this.motivoAnulacion,
      AnularPedido: anularPedido,
      DocumentoOtorgado: documentoOtorgado,
    }).subscribe({
      next: (response: ApiResponse<ResultadoAnulacionDocumentoVenta>) => {
        if (response.Success) {
          Notificar.exito(
            this.texts.get('voided'),
            response.Data?.Mensaje || this.texts.get('documentVoidedSuccessfully'),
          );
          this.getVentasPorTurno(this.idTurno);
          this.motivoAnulacion = '';
          this.selectedRow = null;
        }
        this.spinnerService.hide();
      },
      error: () => this.spinnerService.hide()
    });
  }

  private async solicitarEstadoEntregaDocumento(): Promise<boolean | null | undefined> {
    let paisISO2 = this.configuracionService.snapshot?.PaisISO2?.toUpperCase();

    if (!paisISO2) {
      try {
        const configuracion = await firstValueFrom(this.configuracionService.get());
        paisISO2 = configuracion?.PaisISO2?.toUpperCase();
      } catch {
        Swal.fire({
          title: this.texts.get('error'),
          text: this.texts.get('couldNotDetermineFiscalCountry'),
          icon: 'error',
          confirmButtonText: this.texts.get('ok'),
        });
        return undefined;
      }
    }

    if (paisISO2 !== 'PE') {
      return null;
    }

    const result = await Swal.fire({
      title: this.texts.get('documentDeliveredQuestion'),
      text: this.texts.get('documentDeliveredExplanation'),
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: this.texts.get('documentDeliveredYes'),
      denyButtonText: this.texts.get('documentDeliveredNo'),
      cancelButtonText: this.texts.get('cancel'),
      allowOutsideClick: false,
    });

    if (result.isDismissed) {
      return undefined;
    }

    return result.isConfirmed;
  }

  abrirTeclado(): void {
    const dialogRef = this.dialog.open(DialogMTextComponent, { width: '800px', data: { texto: '' } });
    dialogRef.afterClosed().subscribe(result => { if (result) this.motivoAnulacion = result.value; });
  }

  private alertSeleccione(): void {
    Swal.fire({ title: this.texts.get('attention'), text: this.texts.get('selectDocument'), icon: 'warning', confirmButtonText: this.texts.get('ok') });
  }

  salir(): void { this.dialogRef.close(); }
}
