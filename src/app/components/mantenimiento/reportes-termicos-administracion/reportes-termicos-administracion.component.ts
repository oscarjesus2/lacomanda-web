import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { lastValueFrom } from 'rxjs';
import {
  TipoReporteTermicoAdministracion,
  TurnoReporteTermico,
} from 'src/app/models/reportes-termicos-administracion.models';
import { ReportesTermicosAdministracionService } from 'src/app/services/reportes-termicos-administracion.service';
import Swal from 'sweetalert2';

interface ReporteTermicoDialogData {
  tipo: TipoReporteTermicoAdministracion;
}

interface ReporteTermicoConfiguracion {
  titulo: string;
  descripcion: string;
  icono: string;
  nombreArchivo: string;
}

@Component({
  selector: 'app-reportes-termicos-administracion',
  templateUrl: './reportes-termicos-administracion.component.html',
  styleUrls: ['./reportes-termicos-administracion.component.scss'],
})
export class ReportesTermicosAdministracionComponent implements OnInit, OnDestroy {
  readonly configuraciones: Record<TipoReporteTermicoAdministracion, ReporteTermicoConfiguracion> = {
    'ventas-producto': {
      titulo: 'Ventas por producto',
      descripcion: 'Productos y totales acumulados de todos los turnos incluidos.',
      icono: 'inventory_2',
      nombreArchivo: 'ventas-por-producto',
    },
    'resumen-ventas': {
      titulo: 'Resumen de ventas',
      descripcion: 'Totales, cobros, divisas, tarjetas, gastos y correlativos acumulados.',
      icono: 'summarize',
      nombreArchivo: 'resumen-de-ventas',
    },
    'resumen-documentos': {
      titulo: 'Resumen de documentos',
      descripcion: 'Documentos y totales acumulados por tipo para el período seleccionado.',
      icono: 'receipt_long',
      nombreArchivo: 'resumen-de-documentos',
    },
  };

  readonly configuracion: ReporteTermicoConfiguracion;
  fechaDesde = this.formatearFecha(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  fechaHasta = this.formatearFecha(new Date());
  turnos: TurnoReporteTermico[] = [];
  idTurnoSeleccionado = 0;
  consultaRealizada = false;
  cargandoTurnos = false;
  generandoPdf = false;
  pdfUrl: SafeResourceUrl | null = null;
  private pdfBlobUrl: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ReporteTermicoDialogData,
    private readonly dialogRef: MatDialogRef<ReportesTermicosAdministracionComponent>,
    private readonly reportesService: ReportesTermicosAdministracionService,
    private readonly sanitizer: DomSanitizer,
  ) {
    this.configuracion = this.configuraciones[data.tipo];
  }

  ngOnInit(): void {
    void this.consultarTurnos();
  }

  ngOnDestroy(): void {
    this.liberarPdf();
  }

  get rangoValido(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && this.fechaDesde <= this.fechaHasta;
  }

  get alcanceSeleccionado(): string {
    if (!this.turnos.length) {
      return 'Sin turnos en el período';
    }
    if (this.idTurnoSeleccionado === 0) {
      return `${this.turnos.length} ${this.turnos.length === 1 ? 'turno incluido' : 'turnos incluidos'} · un único reporte consolidado`;
    }
    const turno = this.turnos.find(item => item.IdTurno === this.idTurnoSeleccionado);
    return turno
      ? `${turno.Caja} · Turno ${turno.NroTurno}`
      : 'Turno seleccionado';
  }

  async consultarTurnos(): Promise<void> {
    if (!this.rangoValido) {
      await Swal.fire('Validación', 'Seleccione un rango de fechas válido.', 'warning');
      return;
    }

    this.cargandoTurnos = true;
    this.consultaRealizada = false;
    this.idTurnoSeleccionado = 0;
    this.cerrarPdf();
    try {
      const response = await lastValueFrom(
        this.reportesService.listarTurnos(this.fechaDesde, this.fechaHasta),
      );
      this.turnos = response.Success ? response.Data ?? [] : [];
      this.consultaRealizada = true;
    } catch (error) {
      this.turnos = [];
      console.error('No se pudieron consultar los turnos del reporte térmico.', error);
      await Swal.fire('Error', 'No se pudieron consultar los turnos del período.', 'error');
    } finally {
      this.cargandoTurnos = false;
    }
  }

  async generarPdf(): Promise<void> {
    if (!this.turnos.length || !this.rangoValido) {
      return;
    }

    this.generandoPdf = true;
    this.cerrarPdf();
    try {
      const response = await lastValueFrom(
        this.reportesService.generar(this.data.tipo, {
          FechaDesde: this.fechaDesde,
          FechaHasta: this.fechaHasta,
          IdTurno: this.idTurnoSeleccionado || undefined,
        }),
      );
      if (!response.Success || !response.Data) {
        await Swal.fire('Reporte', 'No se pudo generar el reporte.', 'warning');
        return;
      }

      const blob = this.base64ToBlob(response.Data, 'application/pdf');
      this.pdfBlobUrl = URL.createObjectURL(blob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
    } catch (error) {
      console.error('No se pudo generar el reporte térmico.', error);
      await Swal.fire('Error', 'No se pudo generar el PDF del reporte.', 'error');
    } finally {
      this.generandoPdf = false;
    }
  }

  abrirParaImprimir(): void {
    if (this.pdfBlobUrl) {
      window.open(this.pdfBlobUrl, '_blank', 'noopener');
    }
  }

  descargarPdf(): void {
    if (!this.pdfBlobUrl) {
      return;
    }

    const enlace = document.createElement('a');
    enlace.href = this.pdfBlobUrl;
    enlace.download = `${this.configuracion.nombreArchivo}-${this.fechaDesde}-${this.fechaHasta}.pdf`;
    enlace.click();
  }

  cerrarPdf(): void {
    this.liberarPdf();
    this.pdfUrl = null;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  fechaTurno(turno: TurnoReporteTermico): string {
    const fecha = new Date(turno.FechaTrabajoUtc);
    return Number.isNaN(fecha.getTime())
      ? turno.FechaTrabajoUtc
      : fecha.toLocaleDateString('es-ES');
  }

  private liberarPdf(): void {
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const bytes = Uint8Array.from(atob(base64), caracter => caracter.charCodeAt(0));
    return new Blob([bytes], { type: mimeType });
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
