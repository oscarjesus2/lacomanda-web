import { formatDate } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, finalize } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

import {
  ComisionAnfitrionaDetalle,
  ComisionAnfitrionaReporte,
  RendimientoAnfitrionaReporte,
  RendimientoAnfitrionaResumen,
  SeguimientoComandaFiltro,
  SeguimientoComandaReporte,
  SeguimientoComandaResumen,
  SeguimientoDescuento,
  SeguimientoProductoAnulado,
} from 'src/app/interfaces/seguimiento-comanda.interface';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { SeguimientoComandaService } from 'src/app/services/seguimiento-comanda.service';

export type VistaSeguimientoAdministracion = 'comandas' | 'anfitrionas';

export interface SeguimientoAdministracionData {
  vista: VistaSeguimientoAdministracion;
}

@Component({
  selector: 'app-seguimiento-administracion',
  templateUrl: './seguimiento-administracion.component.html',
  styleUrls: ['./seguimiento-administracion.component.css'],
})
export class SeguimientoAdministracionComponent implements OnInit {
  readonly vista: VistaSeguimientoAdministracion;
  readonly hoy = new Date();

  fechaDesde = formatDate(
    new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1),
    'yyyy-MM-dd',
    'en-US',
  );
  fechaHasta = formatDate(this.hoy, 'yyyy-MM-dd', 'en-US');
  busqueda = '';
  cargando = false;

  seguimiento: SeguimientoComandaReporte | null = null;
  comision: ComisionAnfitrionaReporte | null = null;
  rendimiento: RendimientoAnfitrionaReporte | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<SeguimientoAdministracionComponent>,
    @Inject(MAT_DIALOG_DATA) data: SeguimientoAdministracionData,
    private readonly seguimientoService: SeguimientoComandaService,
    private readonly configuracionService: ConfiguracionService,
  ) {
    this.vista = data.vista;
  }

  ngOnInit(): void {
    this.consultar();
  }

  get esComandas(): boolean {
    return this.vista === 'comandas';
  }

  get titulo(): string {
    return this.esComandas ? 'Resumen y control de comandas' : 'Anfitrionas';
  }

  get descripcion(): string {
    return this.esComandas
      ? 'Supervisa comandas, anulaciones y descuentos sin perder la trazabilidad del monitor.'
      : 'Consulta importes asignados, rendimiento comercial e incidencias por anfitriona.';
  }

  get simbolo(): string {
    return this.configuracionService.snapshot?.SimboloMoneda || 'S/';
  }

  get rangoValido(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && this.fechaDesde <= this.fechaHasta;
  }

  get comandasFiltradas(): SeguimientoComandaResumen[] {
    return this.filtrar(this.seguimiento?.Comandas ?? []);
  }

  get anuladosFiltrados(): SeguimientoProductoAnulado[] {
    return this.filtrar(this.seguimiento?.ProductosAnulados ?? []);
  }

  get descuentosFiltrados(): SeguimientoDescuento[] {
    return this.filtrar(this.seguimiento?.Descuentos ?? []);
  }

  get comisionesFiltradas(): ComisionAnfitrionaDetalle[] {
    return this.filtrar(this.comision?.Detalles ?? []);
  }

  get rendimientoFiltrado(): RendimientoAnfitrionaResumen[] {
    return this.filtrar(this.rendimiento?.Anfitrionas ?? []);
  }

  get maximoImporteRendimiento(): number {
    return Math.max(
      0,
      ...this.rendimientoFiltrado.map(item => Number(item.ImporteAsignado || 0)),
    );
  }

  consultar(): void {
    if (!this.rangoValido) {
      Swal.fire('Validación', 'Seleccione un rango de fechas válido.', 'warning');
      return;
    }

    const filtro: SeguimientoComandaFiltro = {
      Desde: this.fechaDesde,
      Hasta: this.fechaHasta,
    };
    this.cargando = true;

    if (this.esComandas) {
      this.seguimientoService
        .obtenerSeguimiento(filtro)
        .pipe(finalize(() => (this.cargando = false)))
        .subscribe({
          next: response => {
            this.seguimiento = response.Success ? response.Data : null;
          },
          error: error => this.mostrarError(error),
        });
      return;
    }

    forkJoin({
      comision: this.seguimientoService.obtenerComisionAnfitriona(filtro),
      rendimiento: this.seguimientoService.obtenerRendimientoAnfitrionas(filtro),
    })
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: response => {
          this.comision = response.comision.Success
            ? response.comision.Data
            : null;
          this.rendimiento = response.rendimiento.Success
            ? response.rendimiento.Data
            : null;
        },
        error: error => this.mostrarError(error),
      });
  }

  anchoBarra(item: RendimientoAnfitrionaResumen): number {
    return this.maximoImporteRendimiento <= 0
      ? 0
      : Math.max(3, (Number(item.ImporteAsignado || 0) / this.maximoImporteRendimiento) * 100);
  }

  exportarExcel(): void {
    const workbook = XLSX.utils.book_new();

    if (this.esComandas && this.seguimiento) {
      this.agregarHoja(workbook, 'Comandas', this.seguimiento.Comandas);
      this.agregarHoja(workbook, 'Productos anulados', this.seguimiento.ProductosAnulados);
      this.agregarHoja(workbook, 'Descuentos', this.seguimiento.Descuentos);
      XLSX.writeFile(workbook, `ControlComandas_${this.fechaDesde}_${this.fechaHasta}.xlsx`);
      return;
    }

    if (!this.esComandas && this.comision && this.rendimiento) {
      this.agregarHoja(workbook, 'Comisiones', this.comision.Detalles);
      this.agregarHoja(workbook, 'Rendimiento', this.rendimiento.Anfitrionas);
      this.agregarHoja(workbook, 'Evolucion diaria', this.rendimiento.Tendencia);
      XLSX.writeFile(workbook, `Anfitrionas_${this.fechaDesde}_${this.fechaHasta}.xlsx`);
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private filtrar<T extends object>(items: T[]): T[] {
    const termino = this.normalizar(this.busqueda);
    if (!termino) {
      return items;
    }

    return items.filter(item =>
      Object.values(item).some(value => this.normalizar(value).includes(termino)),
    );
  }

  private agregarHoja(
    workbook: XLSX.WorkBook,
    nombre: string,
    datos: object[],
  ): void {
    const worksheet = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(workbook, worksheet, nombre.slice(0, 31));
  }

  private normalizar(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private mostrarError(error: unknown): void {
    console.error('No se pudo cargar el reporte administrativo', error);
    Swal.fire(
      'No se pudo cargar el reporte',
      'Revise el período seleccionado e inténtelo nuevamente.',
      'error',
    );
  }
}
