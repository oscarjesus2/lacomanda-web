import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  ConsultaKardexAlmacen,
  KardexAlmacenCatalogos,
  KardexAlmacenMovimiento,
  KardexProductoCatalogo
} from 'src/app/models/kardex-almacen.models';
import { KardexAlmacenService } from 'src/app/services/kardex-almacen.service';

@Component({
  selector: 'app-kardex-almacen-consulta',
  templateUrl: './kardex-almacen-consulta.component.html'
})
export class KardexAlmacenConsultaComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'fecha',
    'operacion',
    'referencia',
    'entrada',
    'salida',
    'conteo',
    'saldo',
    'precio',
    'observacion'
  ];

  readonly dataSource = new MatTableDataSource<KardexAlmacenMovimiento>([]);
  catalogos: KardexAlmacenCatalogos = { SubAreas: [], Articulos: [] };
  resultado: ConsultaKardexAlmacen | null = null;
  idSubAreaAlmacen: number | null = null;
  idProducto: number | null = null;
  busquedaArticulo = '';
  fechaDesde = this.formatearFecha(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  fechaHasta = this.formatearFecha(new Date());
  cargando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<KardexAlmacenConsultaComponent>,
    private readonly kardexService: KardexAlmacenService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.cargando = true;
    this.kardexService.obtenerCatalogos().subscribe({
      next: response => {
        this.catalogos = response.Data ?? { SubAreas: [], Articulos: [] };
        this.seleccionarPrimeraSubAreaDisponible();
        this.cargando = false;
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar las subáreas y los artículos.');
      }
    });
  }

  get articulosFiltrados(): KardexProductoCatalogo[] {
    if (!this.idSubAreaAlmacen) {
      return [];
    }

    const termino = this.normalizarTexto(this.busquedaArticulo);
    return this.catalogos.Articulos.filter(articulo =>
      articulo.IdSubAreaAlmacen === this.idSubAreaAlmacen &&
      (!termino || this.normalizarTexto(
        `${articulo.Descripcion} ${articulo.UnidadMedida}`
      ).includes(termino))
    );
  }

  cambiarSubArea(): void {
    this.busquedaArticulo = '';
    this.resultado = null;
    this.dataSource.data = [];

    const pertenece = this.catalogos.Articulos.some(articulo =>
      articulo.IdSubAreaAlmacen === this.idSubAreaAlmacen &&
      articulo.IdProducto === this.idProducto
    );
    if (!pertenece) {
      this.idProducto = null;
    }
  }

  buscarArticulo(event: Event): void {
    this.busquedaArticulo = (event.target as HTMLInputElement).value;
  }

  detenerEvento(event: Event): void {
    event.stopPropagation();
  }

  consultar(): void {
    if (!this.idSubAreaAlmacen || !this.idProducto) {
      Swal.fire('Datos requeridos', 'Selecciona una subárea y un artículo.', 'warning');
      return;
    }

    if (!this.fechaDesde || !this.fechaHasta || this.fechaDesde > this.fechaHasta) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser posterior a la fecha final.', 'warning');
      return;
    }

    this.cargando = true;
    this.kardexService
      .consultar(this.idSubAreaAlmacen, this.idProducto, this.fechaDesde, this.fechaHasta)
      .subscribe({
        next: response => {
          this.resultado = response.Data ?? null;
          this.dataSource.data = this.resultado?.Movimientos ?? [];
          if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
          }
          this.cargando = false;
        },
        error: error => {
          this.resultado = null;
          this.dataSource.data = [];
          this.cargando = false;
          this.mostrarError(error, 'No se pudo consultar el Kardex.');
        }
      });
  }

  exportarExcel(): void {
    if (!this.resultado || this.resultado.Movimientos.length === 0) {
      Swal.fire('Sin movimientos', 'Realiza una consulta con movimientos antes de exportar.', 'info');
      return;
    }

    const filas = [
      {
        Fecha: this.fechaDesde,
        Operación: 'SALDO INICIAL',
        Tipo: '',
        Referencia: '',
        Entrada: '',
        Salida: '',
        Conteo: '',
        Saldo: this.resultado.SaldoInicial,
        Precio: '',
        Observación: ''
      },
      ...this.resultado.Movimientos.map(movimiento => ({
        Fecha: new Date(movimiento.Fecha).toLocaleString(),
        Operación: movimiento.Operacion,
        Tipo: movimiento.Tipo,
        Referencia: movimiento.Referencia,
        Entrada: movimiento.Entrada || '',
        Salida: movimiento.Salida || '',
        Conteo: movimiento.ConteoInventario ?? '',
        Saldo: movimiento.Saldo,
        Precio: movimiento.Precio ?? '',
        Observación: movimiento.Observacion ?? ''
      }))
    ];

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Kardex');
    XLSX.writeFile(libro, `Kardex_${this.resultado.IdArticulo}_${this.fechaDesde}_${this.fechaHasta}.xlsx`);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private mostrarError(error: any, mensajePredeterminado: string): void {
    const mensaje = error?.error?.Message || error?.error?.Data || mensajePredeterminado;
    Swal.fire('Error', mensaje, 'error');
  }

  private seleccionarPrimeraSubAreaDisponible(): void {
    const primeraSubArea = this.catalogos.SubAreas.find(subArea =>
      this.catalogos.Articulos.some(articulo =>
        articulo.IdSubAreaAlmacen === subArea.IdSubAreaAlmacen
      )
    );
    this.idSubAreaAlmacen = primeraSubArea?.IdSubAreaAlmacen ?? null;
    this.cambiarSubArea();
  }

  private normalizarTexto(valor: string): string {
    return valor
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
