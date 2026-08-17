import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { CanalVenta } from 'src/app/models/canalventa.models';
import {
  RentabilidadProductoCanalReporte,
  RentabilidadProductoCanalReporteItem
} from 'src/app/models/reportes-almacen.models';
import { CanalVentaService } from 'src/app/services/canal-venta.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { ReportesAlmacenService } from 'src/app/services/reportes-almacen.service';

@Component({
  selector: 'app-rentabilidad-producto-canal-reporte',
  templateUrl: './rentabilidad-producto-canal-reporte.component.html'
})
export class RentabilidadProductoCanalReporteComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = ['producto', 'canal', 'cantidad', 'venta', 'costo', 'margen'];
  readonly dataSource = new MatTableDataSource<RentabilidadProductoCanalReporteItem>([]);
  canales: CanalVenta[] = [];
  resultado: RentabilidadProductoCanalReporte | null = null;
  idCanalVenta: number | null = null;
  fechaDesde = this.formatearFecha(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  fechaHasta = this.formatearFecha(new Date());
  filtro = '';
  monedaSimbolo = '';
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<RentabilidadProductoCanalReporteComponent>,
    private readonly canalVentaService: CanalVentaService,
    private readonly configuracionService: ConfiguracionService,
    private readonly reportesService: ReportesAlmacenService
  ) {
    this.dataSource.filterPredicate = (item, filter) =>
      this.normalizar(`${item.IdProducto} ${item.Producto} ${item.CanalVenta}`)
        .includes(filter);
  }

  ngOnInit(): void {
    this.cargarMoneda();
    this.cargarCanales();
  }

  consultar(): void {
    if (!this.rangoValido()) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser posterior a la final.', 'warning');
      return;
    }

    this.cargando = true;
    this.reportesService.consultarRentabilidadProductoCanal(
      this.fechaDesde,
      this.fechaHasta,
      this.idCanalVenta ?? undefined
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
          error?.error?.Message || 'No se pudo consultar la rentabilidad por producto y canal.'
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
      Swal.fire('Sin registros', 'No hay productos para exportar.', 'info');
      return;
    }

    const hoja = XLSX.utils.json_to_sheet(items.map(item => ({
      Código: item.IdProducto,
      Producto: item.Producto,
      Canal: item.CanalVenta,
      Moneda: item.IdMoneda,
      'Cantidad vendida': item.CantidadVendida,
      'Cantidad analizada': item.CantidadAnalizada,
      'Venta total': item.VentaTotal,
      'Venta analizada': item.VentaAnalizada,
      'Venta sin costo': item.VentaSinCosto,
      'Costo histórico': item.TotalCosto,
      Margen: item.Margen,
      'Margen %': item.MargenPorcentaje,
      'Documentos sin costo': item.VentasSinCosto
    })));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Rentabilidad');
    XLSX.writeFile(
      libro,
      `rentabilidad-producto-canal_${this.fechaDesde}_${this.fechaHasta}.xlsx`
    );
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private cargarCanales(): void {
    this.cargando = true;
    this.canalVentaService.listarDisponibles().subscribe({
      next: canales => {
        this.canales = canales;
        this.cargando = false;
        this.consultar();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error?.error?.Message || 'No se pudieron cargar los canales de venta.');
      }
    });
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
