import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Articulo } from 'src/app/models/articulo.models';
import {
  Inventario,
  InventarioCrear,
  InventarioDetalle,
  InventarioResumen,
  InventarioSubArea,
  SubAreaAlmacenInventario
} from 'src/app/models/inventario.models';
import { ArticuloService } from 'src/app/services/articulo.service';
import { InventarioService } from 'src/app/services/inventario.service';
import { ArticuloMantenimientoComponent } from '../articulo-mantenimiento/articulo-mantenimiento.component';

@Component({
  selector: 'app-inventario-mantenimiento',
  templateUrl: './inventario-mantenimiento.component.html'
})
export class InventarioMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'codigo',
    'fecha',
    'tipo',
    'avance',
    'estado',
    'acciones'
  ];

  inventarios: InventarioResumen[] = [];
  dataSource = new MatTableDataSource<InventarioResumen>([]);
  subAreas: SubAreaAlmacenInventario[] = [];
  articulos: Articulo[] = [];
  filtro = '';
  cargando = false;
  guardando = false;
  showCreate = false;
  inventario: Inventario | null = null;
  idSubAreaSeleccionada: number | null = null;
  idArticuloAgregar: number | null = null;
  nuevoInventario: InventarioCrear = this.crearFormularioInicial();

  constructor(
    private readonly dialogRef:
      MatDialogRef<InventarioMantenimientoComponent>,
    private readonly inventarioService: InventarioService,
    private readonly articuloService: ArticuloService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarInicial();
  }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({
      inventarios: this.inventarioService.listar(),
      subAreas: this.inventarioService.listarSubAreasCuadrables(),
      articulos: this.articuloService.listar()
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.inventarios.Success ||
            !response.subAreas.Success ||
            !response.articulos.Success) {
          Swal.fire(
            'Error',
            'No se pudieron cargar los datos de inventario.',
            'error'
          );
          return;
        }

        this.inventarios = response.inventarios.Data || [];
        this.dataSource.data = this.inventarios;
        this.subAreas = response.subAreas.Data || [];
        this.articulos = (response.articulos.Data || [])
          .filter(a =>
            a.Activo &&
            a.Inventario &&
            !!a.IdUnidadStock);
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error,
          'No se pudieron cargar los inventarios.'
        );
      }
    });
  }

  aplicarFiltro(): void {
    const filtro = this.normalizar(this.filtro);
    this.dataSource.data = this.inventarios.filter(item =>
      this.normalizar(item.IdInventario).includes(filtro) ||
      this.normalizar(item.TipoDescripcion).includes(filtro) ||
      this.normalizar(item.EstadoDescripcion).includes(filtro) ||
      this.normalizar(item.FechaInventario).includes(filtro)
    );
    this.dataSource.paginator?.firstPage();
  }

  nuevo(): void {
    this.nuevoInventario = this.crearFormularioInicial();
    this.showCreate = true;
  }

  crear(): void {
    if (this.nuevoInventario.Tipo === 'P' &&
        !this.nuevoInventario.IdSubAreaAlmacen) {
      Swal.fire(
        'Validación',
        'Seleccione la subárea que desea inventariar.',
        'info'
      );
      return;
    }

    this.guardando = true;
    this.inventarioService.crear(this.nuevoInventario).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo generar el inventario.',
            'error'
          );
          return;
        }

        this.showCreate = false;
        this.asignarInventario(response.Data);
        Swal.fire(
          'Inventario generado',
          'Ya puede registrar el conteo físico.',
          'success'
        );
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo generar el inventario.');
      }
    });
  }

  abrir(row: InventarioResumen): void {
    this.cargando = true;
    this.inventarioService.obtener(row.IdInventario).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo cargar el inventario.',
            'error'
          );
          return;
        }
        this.asignarInventario(response.Data);
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo cargar el inventario.');
      }
    });
  }

  seleccionarSubArea(idSubArea: number): void {
    this.idSubAreaSeleccionada = idSubArea;
    this.idArticuloAgregar = null;
  }

  guardarConteo(): void {
    const subArea = this.subAreaActual;
    if (!this.inventario || !subArea || !this.esEditable) {
      return;
    }

    if (subArea.Detalles.length === 0) {
      Swal.fire(
        'Validación',
        'Agregue al menos un artículo para registrar el conteo.',
        'info'
      );
      return;
    }

    if (subArea.Detalles.some(d =>
      d.StockContado !== null && Number(d.StockContado) < 0
    )) {
      Swal.fire(
        'Validación',
        'Las cantidades contadas no pueden ser negativas.',
        'info'
      );
      return;
    }

    this.guardando = true;
    this.inventarioService.guardarConteo(
      this.inventario.IdInventario,
      subArea.IdSubAreaAlmacen,
      {
        Detalles: subArea.Detalles.map(detalle => ({
          IdProducto: detalle.IdProducto,
          IdUnidadMedida: detalle.IdUnidadMedida,
          StockContado: detalle.StockContado === null ||
            detalle.StockContado === undefined ||
            String(detalle.StockContado).trim() === ''
            ? null
            : Number(detalle.StockContado)
        }))
      }
    ).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo guardar el conteo.',
            'error'
          );
          return;
        }

        this.asignarInventario(
          response.Data,
          subArea.IdSubAreaAlmacen
        );
        Swal.fire(
          response.Data.SubAreas.find(s =>
            s.IdSubAreaAlmacen === subArea.IdSubAreaAlmacen
          )?.ConteoGuardado
            ? 'Conteo completo'
            : 'Borrador guardado',
          '',
          'success'
        );
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar el conteo.');
      }
    });
  }

  agregarArticulo(): void {
    const subArea = this.subAreaActual;
    const articulo = this.articulos.find(a =>
      a.IdProducto === this.idArticuloAgregar
    );
    if (!subArea || !articulo || !articulo.IdUnidadStock) {
      Swal.fire(
        'Validación',
        'Seleccione un artículo controlado por inventario.',
        'info'
      );
      return;
    }

    if (subArea.Detalles.some(d =>
      d.IdProducto === articulo.IdProducto &&
      d.IdUnidadMedida === articulo.IdUnidadStock
    )) {
      Swal.fire(
        'Validación',
        'El artículo ya está incluido en esta subárea.',
        'info'
      );
      return;
    }

    subArea.Detalles = [
      ...subArea.Detalles,
      {
        IdProducto: articulo.IdProducto,
        Codigo: articulo.Codigo,
        Producto: articulo.DescripcionCompra || articulo.Descripcion,
        IdUnidadMedida: articulo.IdUnidadStock,
        Unidad: articulo.UnidadStock,
        StockInicio: 0,
        Ingresos: 0,
        Salidas: 0,
        StockSistema: 0,
        StockContado: null,
        Ajuste: null
      }
    ];
    this.idArticuloAgregar = null;
  }

  nuevoArticulo(): void {
    const reference = this.dialog.open(ArticuloMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 48px)',
      height: 'calc(100vh - 48px)',
      maxWidth: '1120px',
      maxHeight: '840px',
      panelClass: 'dialog-window--workspace',
      data: { creacionRapida: true }
    });

    reference.afterClosed().subscribe((articulo?: Articulo) => {
      if (!articulo) {
        return;
      }
      if (articulo.Activo &&
          articulo.Inventario &&
          articulo.IdUnidadStock) {
        this.articulos = [...this.articulos, articulo]
          .sort((a, b) => a.Descripcion.localeCompare(b.Descripcion));
        this.idArticuloAgregar = articulo.IdProducto;
      } else {
        Swal.fire(
          'Artículo creado',
          'Active “Controlar inventario” para poder agregarlo al conteo.',
          'info'
        );
      }
    });
  }

  cerrarInventario(): void {
    if (!this.inventario || !this.puedeCerrar) {
      return;
    }

    Swal.fire({
      title: 'Cerrar inventario',
      text: 'Se actualizará el stock contado y se registrarán los ajustes en Kardex.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cerrar inventario',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !this.inventario) {
        return;
      }

      this.guardando = true;
      this.inventarioService.cerrar(
        this.inventario.IdInventario
      ).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo cerrar el inventario.',
              'error'
            );
            return;
          }
          this.asignarInventario(response.Data);
          Swal.fire(
            'Inventario cerrado',
            'El stock y el Kardex fueron actualizados.',
            'success'
          );
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo cerrar el inventario.');
        }
      });
    });
  }

  anularInventario(): void {
    if (!this.inventario || !this.esEditable) {
      return;
    }

    Swal.fire({
      title: 'Anular inventario',
      text: 'El conteo se conservará como anulado y no modificará el stock.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular inventario',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-button--danger' }
    }).then(result => {
      if (!result.isConfirmed || !this.inventario) {
        return;
      }

      this.guardando = true;
      this.inventarioService.anular(
        this.inventario.IdInventario
      ).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo anular el inventario.',
              'error'
            );
            return;
          }
          this.asignarInventario(response.Data);
          Swal.fire('Inventario anulado', '', 'success');
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo anular el inventario.');
        }
      });
    });
  }

  volver(): void {
    if (this.showCreate) {
      this.showCreate = false;
      return;
    }
    this.inventario = null;
    this.idSubAreaSeleccionada = null;
    this.cargarInventarios();
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  ajuste(detalle: InventarioDetalle): number | null {
    if (detalle.StockContado === null ||
        detalle.StockContado === undefined ||
        String(detalle.StockContado).trim() === '') {
      return null;
    }
    return this.redondear(
      Number(detalle.StockContado) - Number(detalle.StockSistema),
      4
    );
  }

  get subAreaActual(): InventarioSubArea | null {
    return this.inventario?.SubAreas.find(s =>
      s.IdSubAreaAlmacen === this.idSubAreaSeleccionada
    ) || null;
  }

  get esEditable(): boolean {
    return this.inventario?.Estado === 1;
  }

  get puedeCerrar(): boolean {
    return !!this.inventario &&
      this.esEditable &&
      this.inventario.TotalSubAreas > 0 &&
      this.inventario.SubAreasContadas ===
        this.inventario.TotalSubAreas;
  }

  get articulosDisponibles(): Articulo[] {
    const claves = new Set(
      (this.subAreaActual?.Detalles || []).map(d =>
        `${d.IdProducto}-${d.IdUnidadMedida}`
      )
    );
    return this.articulos.filter(a =>
      !!a.IdUnidadStock &&
      !claves.has(`${a.IdProducto}-${a.IdUnidadStock}`)
    );
  }

  private asignarInventario(
    inventario: Inventario,
    mantenerSubArea?: number
  ): void {
    this.inventario = inventario;
    this.idSubAreaSeleccionada =
      inventario.SubAreas.some(s =>
        s.IdSubAreaAlmacen === mantenerSubArea
      )
        ? mantenerSubArea!
        : inventario.SubAreas[0]?.IdSubAreaAlmacen || null;
    this.showCreate = false;
    this.idArticuloAgregar = null;
  }

  private cargarInventarios(): void {
    this.cargando = true;
    this.inventarioService.listar().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudieron cargar los inventarios.',
            'error'
          );
          return;
        }
        this.inventarios = response.Data || [];
        this.dataSource.data = this.inventarios;
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error,
          'No se pudieron cargar los inventarios.'
        );
      }
    });
  }

  private crearFormularioInicial(): InventarioCrear {
    return {
      Tipo: 'P',
      FechaInventario: new Date(),
      IdSubAreaAlmacen: null
    };
  }

  private normalizar(value: unknown): string {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  private redondear(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire(
      'Error',
      error?.error?.Message ||
      error?.error?.message ||
      fallback,
      'error'
    );
  }
}
