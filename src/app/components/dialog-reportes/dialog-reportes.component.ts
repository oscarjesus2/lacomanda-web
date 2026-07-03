import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxSpinnerService } from 'ngx-spinner';
import { lastValueFrom } from 'rxjs';
import { ResumenCobrosDTO } from 'src/app/interfaces/resumenCobrosDTO.interface';
import { Configuracion } from 'src/app/models/configuracion.models';
import { TurnoService } from 'src/app/services/turno.service';
import Swal from 'sweetalert2';

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

  constructor(
    public dialogRef: MatDialogRef<DialogReportesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogReportesData,
    private turnoService: TurnoService,
    private spinnerService: NgxSpinnerService,
    private sanitizer: DomSanitizer
  ) {
    this.idTurno  = data.idTurno;
    this.config   = data.config;
    this.isAdmin  = data.isAdmin ?? false;
  }

  ngOnInit(): void {
    this.loadResumen();
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
        this.dialogRef.updateSize('92vw', '92vh');
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
    this.dialogRef.updateSize('700px', '');
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

  // ── Helpers ──────────────────────────────────────────────

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
