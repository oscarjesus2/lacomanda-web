import { Component, Inject, OnInit, Optional, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Articulo, ArticuloGuardar, UnidadMedida } from 'src/app/models/articulo.models';
import { Grupo } from 'src/app/models/grupo.models';
import { ImpuestoPais } from 'src/app/models/impuestopais.models';
import { ArticuloService } from 'src/app/services/articulo.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { ImpuestoPaisService } from 'src/app/services/impuestopais.service';
import { UnidadMedidaService } from 'src/app/services/unidad-medida.service';

export interface ArticuloMantenimientoData {
  creacionRapida?: boolean;
}

@Component({
  selector: 'app-articulo-mantenimiento',
  templateUrl: './articulo-mantenimiento.component.html'
})
export class ArticuloMantenimientoComponent implements OnInit {
  @ViewChild('articuloForm') articuloForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'codigo', 'descripcion', 'tipo', 'unidad', 'grupo',
    'stock', 'impuesto', 'activo', 'acciones'
  ];

  articulos: Articulo[] = [];
  dataSource = new MatTableDataSource<Articulo>([]);
  unidades: UnidadMedida[] = [];
  grupos: Grupo[] = [];
  impuestos: ImpuestoPais[] = [];
  filtro = '';
  showForm = false;
  cargando = false;
  guardando = false;
  stockActual = 0;
  articulo = new ArticuloGuardar();
  readonly creacionRapida: boolean;

  constructor(
    private readonly dialogRef: MatDialogRef<ArticuloMantenimientoComponent>,
    private readonly articuloService: ArticuloService,
    private readonly unidadMedidaService: UnidadMedidaService,
    private readonly grupoService: GrupoService,
    private readonly impuestoPaisService: ImpuestoPaisService,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    data: ArticuloMantenimientoData | null
  ) {
    this.creacionRapida = !!data?.creacionRapida;
  }

  ngOnInit(): void {
    this.cargarInicial();
  }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({
      articulos: this.articuloService.listar(),
      unidades: this.unidadMedidaService.listar(),
      impuestos: this.impuestoPaisService.getImpuestoPais(),
      gruposArticulo: this.grupoService.getGrupos('A')
    }).subscribe({
      next: response => {
        if (!response.articulos.Success ||
            !response.unidades.Success ||
            !response.impuestos.Success ||
            !response.gruposArticulo.Success) {
          this.cargando = false;
          Swal.fire('Error', 'No se pudieron cargar los datos del mantenimiento.', 'error');
          return;
        }

        this.articulos = response.articulos.Data || [];
        this.dataSource.data = this.articulos;
        this.unidades = response.unidades.Data || [];
        this.impuestos = (response.impuestos.Data || []).filter(i => i.Activo);
        this.grupos = (response.gruposArticulo.Data || []).filter(g => g.Activo);
        this.cargando = false;
        if (this.creacionRapida) {
          this.nuevo();
        }
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar los artículos.');
      }
    });
  }

  aplicarFiltro(): void {
    const filtro = this.normalizar(this.filtro);
    this.dataSource.data = this.articulos.filter(item =>
      this.normalizar(item.Codigo).includes(filtro) ||
      this.normalizar(item.Descripcion).includes(filtro) ||
      this.normalizar(item.GrupoCompra).includes(filtro) ||
      this.normalizar(item.UnidadStock).includes(filtro) ||
      this.normalizar(this.descripcionTipo(item.InsumoProducto)).includes(filtro) ||
      this.normalizar(item.Activo ? 'activo' : 'inactivo').includes(filtro)
    );
    this.dataSource.paginator?.firstPage();
  }

  nuevo(): void {
    this.stockActual = 0;
    this.articulo = new ArticuloGuardar({
      IdImpuestoPais: this.impuestoPredeterminado()
    });
    this.cargarGrupos('A');
    this.showForm = true;
  }

  editar(row: Articulo): void {
    this.stockActual = row.Stock;
    this.articulo = new ArticuloGuardar({
      IdProducto: row.IdProducto,
      Descripcion: row.DescripcionCompra || row.Descripcion,
      InsumoProducto: row.InsumoProducto,
      IdUnidadStock: row.IdUnidadStock,
      IdUnidadReceta: row.IdUnidadReceta,
      FactorReceta: row.FactorReceta || 1,
      IdGrupoCompra: row.IdGrupoCompra,
      StockMinimo: row.StockMinimo,
      StockMaximo: row.StockMaximo,
      Precio: row.PrecioCompra ?? row.Precio,
      Porcionable: row.Porcionable,
      Porcionado: row.Porcionado,
      AutoPorcion: row.AutoPorcion,
      Produccion: row.Produccion,
      Inventario: row.Inventario,
      Activo: row.Activo,
      IdImpuestoPais: row.IdImpuestoPais
    });
    this.cargarGrupos(row.InsumoProducto === 'I' ? 'I' : 'A');
    this.showForm = true;
  }

  cambiarTipo(): void {
    this.articulo.IdGrupoCompra = null;
    this.cargarGrupos(this.articulo.InsumoProducto === 'I' ? 'I' : 'A');
  }

  cambiarUnidadStock(): void {
    if (this.articulo.IdUnidadReceta === this.articulo.IdUnidadStock) {
      this.articulo.IdUnidadReceta = null;
      this.articulo.FactorReceta = 1;
    }
  }

  cambiarUnidadReceta(): void {
    if (!this.articulo.IdUnidadReceta ||
        this.articulo.IdUnidadReceta === this.articulo.IdUnidadStock) {
      this.articulo.IdUnidadReceta = null;
      this.articulo.FactorReceta = 1;
    }
  }

  guardar(): void {
    if (this.articuloForm.invalid) {
      Object.values(this.articuloForm.controls).forEach(control => {
        control.markAsDirty();
        control.markAsTouched();
      });
      return;
    }

    if (this.articulo.StockMaximo < this.articulo.StockMinimo) {
      Swal.fire('Validación', 'El stock máximo no puede ser menor que el stock mínimo.', 'info');
      return;
    }

    if (this.articulo.IdUnidadReceta && this.articulo.FactorReceta <= 0) {
      Swal.fire('Validación', 'Indique un factor de conversión mayor que cero.', 'info');
      return;
    }

    const esEdicion = this.articulo.IdProducto > 0;
    this.guardando = true;
    const request = esEdicion
      ? this.articuloService.actualizar(this.articulo)
      : this.articuloService.crear(this.articulo);

    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudo guardar el artículo.', 'error');
          return;
        }
        Swal.fire(esEdicion ? 'Artículo actualizado' : 'Artículo creado', '', 'success');
        if (this.creacionRapida && !esEdicion) {
          this.dialogRef.close(response.Data);
          return;
        }
        this.showForm = false;
        this.cargarArticulos();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar el artículo.');
      }
    });
  }

  cancelar(): void {
    if (this.creacionRapida) {
      this.dialogRef.close();
      return;
    }
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  descripcionTipo(tipo: string): string {
    return tipo === 'I' ? 'Insumo' : 'Artículo';
  }

  private cargarArticulos(): void {
    this.cargando = true;
    this.articuloService.listar().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudieron cargar los artículos.', 'error');
          return;
        }
        this.articulos = response.Data || [];
        this.dataSource.data = this.articulos;
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar los artículos.');
      }
    });
  }

  private cargarGrupos(tipo: 'A' | 'I'): void {
    this.grupoService.getGrupos(tipo).subscribe({
      next: response => {
        if (response.Success) {
          this.grupos = (response.Data || []).filter(grupo => grupo.Activo);
        }
      },
      error: error => this.mostrarError(error, 'No se pudieron cargar los grupos.')
    });
  }

  private impuestoPredeterminado(): string {
    return (
      this.impuestos.find(impuesto => impuesto.ImpuestoGeneral)?.IdImpuestoPais ||
      this.impuestos[0]?.IdImpuestoPais ||
      ''
    );
  }

  private normalizar(value: unknown): string {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire('Error', error?.error?.Message || error?.error?.message || fallback, 'error');
  }
}
