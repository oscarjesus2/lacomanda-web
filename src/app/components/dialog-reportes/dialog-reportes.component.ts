import { formatDate } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxSpinnerService } from 'ngx-spinner';
import { lastValueFrom } from 'rxjs';
import { ResumenCobrosDTO } from 'src/app/interfaces/resumenCobrosDTO.interface';
import {
  ComisionAnfitrionaReporte,
  SeguimientoComandaFiltro,
  SeguimientoComandaReporte,
} from 'src/app/interfaces/seguimiento-comanda.interface';
import { Configuracion } from 'src/app/models/configuracion.models';
import { SeguimientoComandaService } from 'src/app/services/seguimiento-comanda.service';
import { TurnoService } from 'src/app/services/turno.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

export interface DialogReportesData {
  idTurno: number;
  config: Configuracion | null;
  isAdmin: boolean;
}

@Component({
  selector: 'app-dialog-reportes',
  templateUrl: './dialog-reportes.component.html',
  styleUrls: ['./dialog-reportes.component.css']
})
export class DialogReportesComponent implements OnInit, OnDestroy {

  idTurno: number;
  config: Configuracion | null;
  isAdmin: boolean;

  resumen: ResumenCobrosDTO | null = null;
  loadingResumen = false;

  pdfUrl: SafeResourceUrl | null = null;
  pdfBlobUrl: string | null = null;   // raw URL para imprimir/nueva pestaña
  pdfTitulo = '';
  loadingPdf: string | null = null;   // clave del botón que está cargando, null = ninguno

  vistaReporte: 'comandas' | 'anfitriona' | null = null;
  modoFiltro: 'turno' | 'fechas' = 'turno';
  fechaDesde = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
  fechaHasta = this.fechaDesde;
  loadingReporte = false;
  seguimiento: SeguimientoComandaReporte | null = null;
  comisionAnfitriona: ComisionAnfitrionaReporte | null = null;

  columnasComandas = [
    'IdTurno', 'FechaTrabajo', 'TipoPedido', 'NroPedido', 'NroCuenta',
    'Mesa', 'NroPax', 'Mozo', 'Descuento', 'Total', 'Estado', 'UsuarioRegistra',
  ];
  columnasAnulados = [
    'IdTurno', 'FechaTrabajo', 'TipoPedido', 'NroPedido', 'NroCuenta',
    'Producto', 'Cantidad', 'Subtotal', 'UsuarioAnula', 'FechaAnula', 'MotivoAnula',
  ];
  columnasDescuentos = [
    'IdTurno', 'FechaTrabajo', 'TipoPedido', 'NroPedido', 'TipoDescuento',
    'Producto', 'Cantidad', 'Subtotal', 'MontoDescuento', 'Estado',
    'UsuarioDescuento', 'FechaDescuento',
  ];
  columnasAnfitriona = [
    'IdTurno', 'FechaTrabajo', 'NroPedido', 'NroCuenta', 'Anfitrionas',
    'CantidadAnfitrionas', 'Producto', 'Precio', 'Cantidad', 'ImporteNeto',
    'ImportePorAnfitriona', 'NumeroReimpresiones', 'TipoIngreso',
  ];

  constructor(
    public dialogRef: MatDialogRef<DialogReportesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogReportesData,
    private turnoService: TurnoService,
    private seguimientoComandaService: SeguimientoComandaService,
    private spinnerService: NgxSpinnerService,
    private sanitizer: DomSanitizer
  ) {
    this.idTurno  = data.idTurno;
    this.config   = data.config;
    this.isAdmin  = data.isAdmin ?? false;
  }

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadResumen();
    }
  }

  ngOnDestroy(): void {
    this.revokePdf();
  }

  // ── Resumen de cobros ────────────────────────────────────

  async loadResumen(): Promise<void> {
    this.loadingResumen = true;
    try {
      const response = await lastValueFrom(this.turnoService.GetResumenCobros(this.idTurno));
      if (response.Success) {
        this.resumen = response.Data;
      }
    } catch (e) {
      console.error('Error al cargar resumen de cobros', e);
    } finally {
      this.loadingResumen = false;
    }
  }

  // ── PDFs — método genérico ───────────────────────────────

  verVentasPorProducto(): Promise<void> {
    return this.abrirPdf('ventas-producto', 'Ventas por Producto',
      () => this.turnoService.GetVentasPorProducto(this.idTurno));
  }

  verResumenVenta(): Promise<void> {
    return this.abrirPdf('resumen-venta', 'Resumen de Ventas',
      () => this.turnoService.GetResumenVenta(this.idTurno));
  }

  verResuDocumentos(): Promise<void> {
    return this.abrirPdf('resu-documentos', 'Resumen de Documentos',
      () => this.turnoService.GetResuDocumentos(this.idTurno));
  }

  private async abrirPdf(
    key: string,
    titulo: string,
    loader: () => import('rxjs').Observable<import('src/app/interfaces/apirResponse.interface').ApiResponse<string>>
  ): Promise<void> {
    this.loadingPdf = key;
    this.revokePdf();

    try {
      const response = await lastValueFrom(loader());
      if (response.Success && response.Data) {
        const blob = this.base64ToBlob(response.Data, 'application/pdf');
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfUrl     = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfTitulo  = titulo;
        this.activarVistaAmplia();
      } else {
        Swal.fire('Reporte', 'No se pudo generar el reporte.', 'warning');
      }
    } catch (e) {
      Swal.fire('Error', 'Ocurrió un error al generar el PDF.', 'error');
    } finally {
      this.loadingPdf = null;
    }
  }

  cerrarPdf(): void {
    this.revokePdf();
    this.pdfUrl    = null;
    this.pdfTitulo = '';
    this.desactivarVistaAmplia();
  }

  private revokePdf(): void {
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
  }

  imprimirPdf(): void {
    if (this.pdfBlobUrl) {
      // Abrir en nueva pestaña — el visor nativo del navegador incluye botón imprimir
      window.open(this.pdfBlobUrl, '_blank');
    }
  }

  // ── Seguimiento de comandas y comisión anfitriona ──────

  abrirSeguimientoComandas(): void {
    this.vistaReporte = 'comandas';
    this.activarVistaAmplia();
    this.consultarReporte();
  }

  abrirComisionAnfitriona(): void {
    if (!this.config?.Anfitrionas) {
      return;
    }

    this.vistaReporte = 'anfitriona';
    this.activarVistaAmplia();
    this.consultarReporte();
  }

  volverAReportes(): void {
    this.vistaReporte = null;
    this.seguimiento = null;
    this.comisionAnfitriona = null;
    this.desactivarVistaAmplia();
  }

  cambiarModoFiltro(modo: 'turno' | 'fechas'): void {
    this.modoFiltro = modo;
  }

  get rangoValido(): boolean {
    return !!this.fechaDesde &&
      !!this.fechaHasta &&
      this.fechaDesde <= this.fechaHasta;
  }

  async consultarReporte(): Promise<void> {
    if (this.modoFiltro === 'fechas' && !this.rangoValido) {
      Swal.fire('Validación', 'Seleccione un rango de fechas válido.', 'warning');
      return;
    }

    const filtro = this.crearFiltro();
    this.loadingReporte = true;

    try {
      if (this.vistaReporte === 'comandas') {
        const response = await lastValueFrom(
          this.seguimientoComandaService.obtenerSeguimiento(filtro),
        );
        this.seguimiento = response.Success ? response.Data : null;
      } else if (this.vistaReporte === 'anfitriona') {
        const response = await lastValueFrom(
          this.seguimientoComandaService.obtenerComisionAnfitriona(filtro),
        );
        this.comisionAnfitriona = response.Success ? response.Data : null;
      }
    } catch (error) {
      console.error('Error al consultar el reporte de seguimiento', error);
      Swal.fire('Error', 'No se pudo consultar el reporte.', 'error');
    } finally {
      this.loadingReporte = false;
    }
  }

  exportarReporte(): void {
    if (this.vistaReporte === 'comandas' && this.seguimiento) {
      const workbook = XLSX.utils.book_new();
      this.agregarHoja(
        workbook,
        'Comandas',
        this.seguimiento.Comandas,
      );
      this.agregarHoja(
        workbook,
        'Productos anulados',
        this.seguimiento.ProductosAnulados,
      );
      this.agregarHoja(
        workbook,
        'Descuentos',
        this.seguimiento.Descuentos,
      );
      XLSX.writeFile(
        workbook,
        `SeguimientoComandas_${formatDate(new Date(), 'yyyyMMdd', 'en-US')}.xlsx`,
      );
      return;
    }

    if (this.vistaReporte === 'anfitriona' && this.comisionAnfitriona) {
      const workbook = XLSX.utils.book_new();
      this.agregarHoja(
        workbook,
        'Comision anfitriona',
        this.comisionAnfitriona.Detalles,
      );
      XLSX.writeFile(
        workbook,
        `ComisionAnfitriona_${formatDate(new Date(), 'yyyyMMdd', 'en-US')}.xlsx`,
      );
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private crearFiltro(): SeguimientoComandaFiltro {
    return this.modoFiltro === 'turno'
      ? { IdTurno: this.idTurno }
      : { Desde: this.fechaDesde, Hasta: this.fechaHasta };
  }

  private agregarHoja(
    workbook: XLSX.WorkBook,
    nombre: string,
    datos: object[],
  ): void {
    const worksheet = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(workbook, worksheet, nombre.slice(0, 31));
  }

  private activarVistaAmplia(): void {
    this.dialogRef.addPanelClass('dialog-window--workspace');
    this.dialogRef.updateSize();
  }

  private desactivarVistaAmplia(): void {
    this.dialogRef.removePanelClass('dialog-window--workspace');
    this.dialogRef.updateSize('700px', '');
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  }

  get simbolo(): string {
    return this.config?.SimboloMoneda || 'S/';
  }

  close(): void {
    this.dialogRef.close();
  }
}
