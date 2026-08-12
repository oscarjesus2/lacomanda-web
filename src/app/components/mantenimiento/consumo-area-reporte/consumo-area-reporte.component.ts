import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { SubAreaAlmacen } from 'src/app/models/almacen-maestro.models';
import {
  ConsumoAreaReporte,
  ConsumoAreaReporteItem
} from 'src/app/models/reportes-almacen.models';
import { ReportesAlmacenService } from 'src/app/services/reportes-almacen.service';
import { SubAreaAlmacenService } from 'src/app/services/sub-area-almacen.service';

@Component({
  selector: 'app-consumo-area-reporte',
  templateUrl: './consumo-area-reporte.component.html'
})
export class ConsumoAreaReporteComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'subArea',
    'articulo',
    'unidadReceta',
    'cantidadReceta',
    'factor',
    'consumo'
  ];

  readonly dataSource = new MatTableDataSource<ConsumoAreaReporteItem>([]);
  subAreas: SubAreaAlmacen[] = [];
  resultado: ConsumoAreaReporte | null = null;
  idSubAreaAlmacen: number | null = null;
  fechaDesde = this.formatearFecha(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  fechaHasta = this.formatearFecha(new Date());
  filtro = '';
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<ConsumoAreaReporteComponent>,
    private readonly subAreaAlmacenService: SubAreaAlmacenService,
    private readonly reportesService: ReportesAlmacenService
  ) {
    this.dataSource.filterPredicate = (item, filter) =>
      this.normalizar(
        `${item.IdArticulo} ${item.Articulo} ${item.SubAreaAlmacen} ` +
        `${item.UnidadArticulo} ${item.UnidadReceta}`
      ).includes(filter);
  }

  ngOnInit(): void {
    this.cargarSubAreas();
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
    this.reportesService.consultarConsumoArea(
      this.fechaDesde,
      this.fechaHasta,
      this.idSubAreaAlmacen ?? undefined
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
          error?.error?.Message ||
          'No se pudo consultar el consumo de artículos por subárea.'
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
      Swal.fire('Sin registros', 'No hay consumos para exportar.', 'info');
      return;
    }

    const filas = items.map(item => ({
      'Subárea de descarga': item.SubAreaAlmacen,
      Código: item.IdArticulo,
      Artículo: item.Articulo,
      'Unidad de receta': item.UnidadReceta,
      'Cantidad en receta': item.CantidadReceta,
      'Factor de conversión': item.FactorReceta,
      'Consumo en unidad de stock': item.Consumo,
      'Unidad de stock': item.UnidadArticulo
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Consumo subárea');
    XLSX.writeFile(
      libro,
      `consumo-articulos_${this.fechaDesde}_${this.fechaHasta}.xlsx`
    );
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private cargarSubAreas(): void {
    this.cargando = true;
    this.subAreaAlmacenService.listar().subscribe({
      next: response => {
        this.subAreas = (response.Data ?? []).filter(subArea => subArea.Activo);
        this.cargando = false;
        this.consultar();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error?.error?.Message || 'No se pudieron cargar las subáreas de almacén.'
        );
      }
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
