import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  VentaCostoReporte,
  VentaCostoReporteItem
} from 'src/app/models/reportes-almacen.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { ReportesAlmacenService } from 'src/app/services/reportes-almacen.service';

@Component({
  selector: 'app-venta-costo-reporte',
  templateUrl: './venta-costo-reporte.component.html'
})
export class VentaCostoReporteComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'fecha',
    'documento',
    'turno',
    'canal',
    'venta',
    'costo',
    'margen'
  ];

  readonly dataSource = new MatTableDataSource<VentaCostoReporteItem>([]);
  resultado: VentaCostoReporte | null = null;
  fechaDesde = this.formatearFecha(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  fechaHasta = this.formatearFecha(new Date());
  filtro = '';
  monedaSimbolo = '';
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<VentaCostoReporteComponent>,
    private readonly configuracionService: ConfiguracionService,
    private readonly reportesService: ReportesAlmacenService
  ) {
    this.dataSource.filterPredicate = (item, filter) =>
      this.normalizar(
        `${item.IdVenta} ${item.Documento} ${item.CanalVenta} ${item.NroTurno}`
      ).includes(filter);
  }

  ngOnInit(): void {
    this.cargarMoneda();
    this.consultar();
  }

  consultar(): void {
    if (!this.rangoValido()) {
      Swal.fire(
        'Rango inválido',
        'La fecha inicial no puede ser posterior a la fecha final.',
        'warning'
      );
      return;
    }

    this.cargando = true;
    this.reportesService.consultarVentaCosto(
      this.fechaDesde,
      this.fechaHasta
    ).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }

        this.resultado = response.Data;
        this.dataSource.data = response.Data?.Items ?? [];
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.resultado = null;
        this.dataSource.data = [];
        this.mostrarError(
          error?.error?.Message || 'No se pudo consultar la venta versus costo.'
        );
      }
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.normalizar(this.filtro);
    this.dataSource.paginator?.firstPage();
  }

  exportarExcel(): void {
    const items = this.dataSource.filteredData;
    if (!items.length) {
      Swal.fire('Sin registros', 'No hay ventas para exportar.', 'info');
      return;
    }

    const filas = items.map(item => ({
      Fecha: item.Fecha,
      'Id. venta': item.IdVenta,
      Documento: item.Documento,
      Turno: item.NroTurno,
      Canal: item.CanalVenta,
      Moneda: item.IdMoneda,
      Venta: item.TotalVenta,
      'Estado del costo': this.descripcionEstadoCosto(item),
      'Costo histórico': item.TotalCosto,
      Diferencia: item.Diferencia,
      'Margen %': item.MargenPorcentaje
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Venta vs costo histórico');
    XLSX.writeFile(
      libro,
      `venta-vs-costo-historico_${this.fechaDesde}_${this.fechaHasta}.xlsx`
    );
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private descripcionEstadoCosto(item: VentaCostoReporteItem): string {
    if (!item.CostoDisponible) {
      return item.TurnoCerrado
        ? 'Sin costo histórico en Kardex'
        : 'Pendiente de cierre de turno';
    }

    return item.TieneDetalleCosto
      ? 'Fotografía histórica guardada'
      : 'Sin detalle histórico de costo';
  }

  private cargarMoneda(): void {
    const configuracion = this.configuracionService.snapshot;
    if (configuracion) {
      this.monedaSimbolo = configuracion.SimboloMoneda || '';
      return;
    }

    this.configuracionService.get().subscribe({
      next: value => this.monedaSimbolo = value.SimboloMoneda || '',
      error: () => this.monedaSimbolo = ''
    });
  }

  private rangoValido(): boolean {
    return !!this.fechaDesde &&
      !!this.fechaHasta &&
      this.fechaDesde <= this.fechaHasta;
  }

  private mostrarError(mensaje: string): void {
    Swal.fire('Error', mensaje, 'error');
  }

  private normalizar(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const day = `${fecha.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
