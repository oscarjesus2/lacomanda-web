import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { SubAreaAlmacen } from 'src/app/models/almacen-maestro.models';
import {
  ConsumoTeoricoRealReporte,
  ConsumoTeoricoRealReporteItem
} from 'src/app/models/reportes-almacen.models';
import { ReportesAlmacenService } from 'src/app/services/reportes-almacen.service';
import { SubAreaAlmacenService } from 'src/app/services/sub-area-almacen.service';
import { TenantService } from 'src/app/services/tenant.service';

@Component({
  selector: 'app-consumo-teorico-real-reporte',
  templateUrl: './consumo-teorico-real-reporte.component.html'
})
export class ConsumoTeoricoRealReporteComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'inventario',
    'subArea',
    'articulo',
    'teorico',
    'real',
    'diferencia'
  ];
  readonly dataSource = new MatTableDataSource<ConsumoTeoricoRealReporteItem>([]);
  subAreas: SubAreaAlmacen[] = [];
  resultado: ConsumoTeoricoRealReporte | null = null;
  idSubAreaAlmacen: number | null = null;
  fechaDesde = '';
  fechaHasta = '';
  filtro = '';
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<ConsumoTeoricoRealReporteComponent>,
    private readonly subAreaService: SubAreaAlmacenService,
    private readonly reportesService: ReportesAlmacenService,
    private readonly tenantService: TenantService
  ) {
    this.dataSource.filterPredicate = (item, filter) =>
      this.normalizar(
        `${item.IdInventario} ${item.SubAreaAlmacen} ${item.IdArticulo} ` +
        `${item.Articulo} ${item.UnidadMedida}`
      ).includes(filter);
  }

  ngOnInit(): void {
    this.tenantService.getTenant().subscribe({
      next: response => {
        this.establecerRangoPredeterminado(
          response.Data?.[0]?.ZonaHorariaId || 'UTC'
        );
        this.cargarSubAreas();
      },
      error: () => {
        this.establecerRangoPredeterminado('UTC');
        this.cargarSubAreas();
      }
    });
  }

  establecerRangoPredeterminado(
    zonaHoraria: string,
    ahora = new Date()
  ): void {
    let zonaValida = zonaHoraria;
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: zonaValida })
        .format(ahora);
    } catch {
      zonaValida = 'UTC';
    }

    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaValida,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(ahora);
    const valores = Object.fromEntries(
      partes.map(parte => [parte.type, parte.value])
    );
    this.fechaDesde = `${valores['year']}-${valores['month']}-01`;
    this.fechaHasta =
      `${valores['year']}-${valores['month']}-${valores['day']}`;
  }

  consultar(): void {
    if (!this.rangoValido()) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser posterior a la final.', 'warning');
      return;
    }

    this.cargando = true;
    this.reportesService.consultarConsumoTeoricoReal(
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
          error?.error?.Message || 'No se pudo consultar el consumo teórico versus real.'
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
      Swal.fire('Sin registros', 'No hay inventarios cerrados para exportar.', 'info');
      return;
    }

    const hoja = XLSX.utils.json_to_sheet(items.map(item => ({
      Inventario: item.IdInventario,
      Fecha: item.FechaInventario,
      Subárea: item.SubAreaAlmacen,
      Artículo: item.Articulo,
      Unidad: item.UnidadMedida,
      'Stock inicial': item.StockInicio,
      Ingresos: item.Ingresos,
      'Consumo teórico': item.ConsumoTeorico,
      'Stock contado': item.StockContado,
      'Consumo real': item.ConsumoReal,
      Diferencia: item.Diferencia,
      'Diferencia %': item.DiferenciaPorcentaje
    })));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Teórico vs real');
    XLSX.writeFile(
      libro,
      `consumo-teorico-real_${this.fechaDesde}_${this.fechaHasta}.xlsx`
    );
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  formatearFechaConsulta(fecha: string | null | undefined): string {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? '');
    return coincidencia
      ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`
      : '—';
  }

  private cargarSubAreas(): void {
    this.cargando = true;
    this.subAreaService.listar().subscribe({
      next: response => {
        this.subAreas = (response.Data ?? []).filter(item => item.Activo);
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
    return !!this.fechaDesde && !!this.fechaHasta && this.fechaDesde <= this.fechaHasta;
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

}
