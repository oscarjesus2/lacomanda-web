import { fechaReporte, imprimirReporte } from 'src/app/shared/impresion/imprimir-reporte';
import { Component, Inject, OnInit, Optional, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  CoberturaStockEstado,
  CoberturaStockReporte,
  CoberturaStockReporteItem
} from 'src/app/models/reportes-almacen.models';
import { ReportesAlmacenService } from 'src/app/services/reportes-almacen.service';

@Component({
  selector: 'app-cobertura-stock-reporte',
  templateUrl: './cobertura-stock-reporte.component.html'
})
export class CoberturaStockReporteComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'articulo',
    'stock',
    'limites',
    'consumo',
    'cobertura',
    'estado'
  ];
  readonly dataSource = new MatTableDataSource<CoberturaStockReporteItem>([]);
  resultado: CoberturaStockReporte | null = null;
  fechaDesde = this.formatearFecha(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  fechaHasta = this.formatearFecha(new Date());
  filtro = '';
  private periodoConsultado = '';
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<CoberturaStockReporteComponent>,
    private readonly reportesService: ReportesAlmacenService,
    @Optional() @Inject(MAT_DIALOG_DATA) data?: { desde?: string; hasta?: string; subarea?: number }
  ) {
    if (data?.desde) this.fechaDesde = data.desde;
    if (data?.hasta) this.fechaHasta = data.hasta;
    this.dataSource.filterPredicate = (item, filter) =>
      this.normalizar(`${item.IdArticulo} ${item.Articulo} ${item.UnidadMedida} ${item.Estado}`)
        .includes(filter);
  }

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    if (!this.rangoValido()) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser posterior a la final.', 'warning');
      return;
    }

    const periodo = `Período consultado: ${fechaReporte(this.fechaDesde)} — ${fechaReporte(this.fechaHasta)}`;
    this.cargando = true;
    this.reportesService.consultarCoberturaStock(this.fechaDesde, this.fechaHasta)
      .subscribe({
        next: response => {
          this.cargando = false;
          if (!response.Success) {
            this.mostrarError(response.Message);
            return;
          }

          this.periodoConsultado = periodo;
        this.resultado = response.Data;
          this.dataSource.data = response.Data?.Items ?? [];
          this.aplicarFiltro();
        },
        error: error => {
          this.cargando = false;
          this.resultado = null;
          this.dataSource.data = [];
          this.mostrarError(error?.error?.Message || 'No se pudo consultar la cobertura de stock.');
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
      Swal.fire('Sin registros', 'No hay artículos para exportar.', 'info');
      return;
    }

    const hoja = XLSX.utils.json_to_sheet(this.filasParaReporte());
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Cobertura de stock');
    XLSX.writeFile(
      libro,
      `cobertura-stock_${this.fechaDesde}_${this.fechaHasta}.xlsx`
    );
  }

  private filasParaReporte(paraImprimir = false) {
    return this.dataSource.filteredData.map(item => ({
      Código: item.IdArticulo,
      Artículo: item.Articulo,
      Unidad: item.UnidadMedida,
      'Stock actual': item.StockActual,
      'Stock mínimo': item.StockMinimo,
      'Stock máximo': item.StockMaximo,
      Ubicaciones: item.CantidadUbicaciones,
      'Consumo del período': item.ConsumoPeriodo,
      'Consumo promedio diario': item.ConsumoPromedioDiario,
      'Días de cobertura': item.DiasCobertura,
      'Agotamiento estimado': paraImprimir ? fechaReporte(item.FechaAgotamientoEstimada) : item.FechaAgotamientoEstimada,
      Estado: this.descripcionEstado(item.Estado)
    }));
  }

  imprimir(): void {
    const filas = this.filasParaReporte(true);
    const detalles = [
      this.periodoConsultado,
      this.filtro.trim() ? `Búsqueda: ${this.filtro.trim()}` : ''
    ];
    imprimirReporte({ titulo: 'Cobertura de stock', filas, detalles });
  }

  descripcionEstado(estado: CoberturaStockEstado): string {
    const textos: Record<CoberturaStockEstado, string> = {
      SIN_STOCK: 'Sin stock',
      BAJO_MINIMO: 'Bajo mínimo',
      SOBRE_MAXIMO: 'Sobre máximo',
      SIN_CONSUMO: 'Sin consumo',
      DISPONIBLE: 'Disponible'
    };
    return textos[estado];
  }

  claseEstado(estado: CoberturaStockEstado): string {
    if (estado === 'SIN_STOCK') {
      return 'status-badge--danger';
    }

    if (estado === 'BAJO_MINIMO' || estado === 'SOBRE_MAXIMO') {
      return 'status-badge--warning';
    }

    return '';
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private rangoValido(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && this.fechaDesde <= this.fechaHasta;
  }

  private mostrarError(mensaje: string): void {
    Swal.fire('Error', mensaje, 'error');
  }

  private normalizar(valor: unknown): string {
    return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const day = `${fecha.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
