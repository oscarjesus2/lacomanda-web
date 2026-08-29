import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  ConsultaStockAlmacen,
  StockAlmacenItem,
  SubAreaAlmacenStock
} from 'src/app/models/stock-almacen.models';
import { StockAlmacenService } from 'src/app/services/stock-almacen.service';

@Component({
  selector: 'app-stock-almacen-consulta',
  templateUrl: './stock-almacen-consulta.component.html'
})
export class StockAlmacenConsultaComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'area',
    'producto',
    'unidad',
    'limites',
    'inventario',
    'movimientos',
    'actual',
    'receta'
  ];

  consulta: ConsultaStockAlmacen | null = null;
  dataSource = new MatTableDataSource<StockAlmacenItem>([]);
  idAreaAlmacen: number | null = null;
  idSubAreaAlmacen: number | null = null;
  filtro = '';
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<StockAlmacenConsultaComponent>,
    private readonly stockAlmacenService: StockAlmacenService
  ) {
    this.dataSource.filterPredicate = (item, filter) => {
      const texto = [
        item.Area,
        item.SubArea,
        item.IdProducto,
        item.Producto,
        item.UnidadStock,
        item.UnidadReceta
      ].join(' ');
      return this.normalizar(texto).includes(filter);
    };
  }

  ngOnInit(): void {
    this.consultar();
  }

  get subAreasFiltradas(): SubAreaAlmacenStock[] {
    const subAreas = this.consulta?.SubAreas || [];
    return this.idAreaAlmacen
      ? subAreas.filter(x => x.IdAreaAlmacen === this.idAreaAlmacen)
      : subAreas;
  }

  cambiarArea(): void {
    this.idSubAreaAlmacen = null;
    this.consultar();
  }

  cambiarSubArea(): void {
    this.consultar();
  }

  consultar(): void {
    this.cargando = true;
    this.stockAlmacenService.consultar(
      this.idAreaAlmacen || undefined,
      this.idSubAreaAlmacen || undefined
    ).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }

        this.consulta = response.Data;
        this.dataSource.data = response.Data?.Items || [];
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error?.error?.Message || 'No se pudo consultar el stock de almacén.'
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
      Swal.fire('Sin registros', 'No hay existencias para exportar.', 'info');
      return;
    }

    const filas = items.map(item => ({
      'Área de almacén': item.Area,
      'Subárea': item.SubArea,
      'Código': item.IdProducto,
      'Artículo': item.Producto,
      'Unidad de stock': item.UnidadStock,
      'Stock mínimo': item.StockMinimo,
      'Stock máximo': item.StockMaximo,
      'Último inventario': item.FechaUltimoInventario
        ? new Date(item.FechaUltimoInventario).toLocaleDateString()
        : 'Sin inventario',
      'Stock último inventario': item.StockUltimoInventario ?? '',
      'Entradas posteriores': item.EntradasDesdeInventario,
      'Salidas posteriores': item.SalidasDesdeInventario,
      'Stock actual': item.StockActual,
      'Bajo mínimo': item.BajoMinimo ? 'Sí' : 'No',
      'Unidad de receta': item.UnidadReceta || '',
      'Stock en unidad de receta': item.StockEnUnidadReceta ?? ''
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Stock por área');
    XLSX.writeFile(libro, 'stock-por-area.xlsx');
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private normalizar(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private mostrarError(mensaje?: string): void {
    Swal.fire(
      'Error',
      mensaje || 'No se pudo consultar el stock de almacén.',
      'error'
    );
  }
}
