import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { Articulo } from 'src/app/models/articulo.models';
import { Familia } from 'src/app/models/familia.models';
import {
  AreaAlmacen,
  RecetaDetalle,
  RecetaDetalleGuardar,
  RecetaGuardar,
  RecetaReporteFila,
  RecetaResumen
} from 'src/app/models/receta.models';
import { ArticuloService } from 'src/app/services/articulo.service';
import { AreaAlmacenService } from 'src/app/services/area-almacen.service';
import { FamiliaService } from 'src/app/services/familia.service';
import { RecetaService } from 'src/app/services/receta.service';
import { ArticuloMantenimientoComponent } from '../articulo-mantenimiento/articulo-mantenimiento.component';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-receta-mantenimiento',
  templateUrl: './receta-mantenimiento.component.html'
})
export class RecetaMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'producto',
    'precioVenta',
    'mesa',
    'llevar',
    'delivery',
    'estado',
    'acciones'
  ];

  recetas: RecetaResumen[] = [];
  dataSource = new MatTableDataSource<RecetaResumen>([]);
  articulos: Articulo[] = [];
  areas: AreaAlmacen[] = [];
  familias: Familia[] = [];
  filtro = '';
  cargando = false;
  guardando = false;
  showForm = false;
  showReport = false;
  tipoReporte: 'todos' | 'producto' | 'familia' | 'insumo' = 'todos';
  idProductoReporte: number | null = null;
  idFamiliaReporte: number | null = null;
  idArticuloReporte: number | null = null;
  reporte: RecetaReporteFila[] = [];
  recetaSeleccionada: RecetaResumen | null = null;
  detalles: RecetaDetalle[] = [];
  detalleActual: RecetaDetalleGuardar = this.nuevoDetalle();
  indiceDetalleEditado: number | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<RecetaMantenimientoComponent>,
    private readonly recetaService: RecetaService,
    private readonly areaAlmacenService: AreaAlmacenService,
    private readonly articuloService: ArticuloService,
    private readonly familiaService: FamiliaService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarInicial();
  }

  cargarInicial(): void {
    this.cargando = true;
    // Las familias no se piden aquí: son de venta y alimentan solo el filtro de
    // un informe. Un restaurante con plan de solo almacén recibe 403 en ese
    // catálogo, y al ir en el forkJoin tumbaba también recetas, artículos y
    // áreas. Se cargan bajo demanda en cambiarTipoReporte().
    forkJoin({
      recetas: this.recetaService.listar(),
      articulos: this.articuloService.listar(),
      areas: this.areaAlmacenService.listarActivas()
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.recetas.Success ||
            !response.articulos.Success ||
            !response.areas.Success) {
          Swal.fire(
            'Error',
            'No se pudieron cargar los datos del mantenimiento.',
            'error'
          );
          return;
        }

        this.recetas = response.recetas.Data || [];
        this.dataSource.data = this.recetas;
        this.articulos = (response.articulos.Data || [])
          .filter(articulo => articulo.Activo);
        this.areas = response.areas.Data || [];
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar las recetas.');
      }
    });
  }

  aplicarFiltro(): void {
    const filtro = this.normalizar(this.filtro);
    this.dataSource.data = this.recetas.filter(receta =>
      this.normalizar(receta.Producto).includes(filtro) ||
      this.normalizar(
        receta.TieneRecetaRegistrada ? 'con receta' : 'sin receta'
      ).includes(filtro)
    );
    this.dataSource.paginator?.firstPage();
  }

  abrir(row: RecetaResumen): void {
    this.recetaSeleccionada = row;
    this.detalleActual = this.nuevoDetalle();
    this.indiceDetalleEditado = null;

    if (!row.IdReceta) {
      this.detalles = [];
      this.showForm = true;
      return;
    }

    this.cargando = true;
    this.recetaService.obtener(row.IdReceta).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo cargar la receta.',
            'error'
          );
          return;
        }

        this.detalles = [...response.Data.Detalles];
        this.showForm = true;
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo cargar la receta.');
      }
    });
  }

  abrirReporte(row?: RecetaResumen): void {
    this.showReport = true;
    this.reporte = [];
    if (row) {
      this.tipoReporte = 'producto';
      this.idProductoReporte = row.IdProducto;
    } else {
      this.tipoReporte = 'todos';
      this.idProductoReporte = null;
    }
    this.idFamiliaReporte = null;
    this.idArticuloReporte = null;
    this.consultarReporte();
  }

  cambiarTipoReporte(): void {
    this.idProductoReporte = null;
    this.idFamiliaReporte = null;
    this.idArticuloReporte = null;
    this.reporte = [];
    if (this.tipoReporte === 'familia') {
      this.cargarFamilias();
    }
    if (this.tipoReporte === 'todos') {
      this.consultarReporte();
    }
  }

  /**
   * Catálogo de venta, solo necesario para el informe por familia. Si la
   * licencia no lo cubre se deja vacío en silencio: el resto de la pantalla es
   * de almacén y debe seguir funcionando.
   */
  private cargarFamilias(): void {
    if (this.familias.length > 0) {
      return;
    }

    this.familiaService.getFamilias().subscribe({
      next: response => this.familias = response.Data || [],
      error: () => this.familias = []
    });
  }

  consultarReporte(): void {
    if ((this.tipoReporte === 'producto' && !this.idProductoReporte) ||
        (this.tipoReporte === 'familia' && !this.idFamiliaReporte) ||
        (this.tipoReporte === 'insumo' && !this.idArticuloReporte)) {
      Swal.fire(
        'Validación',
        'Seleccione el criterio del reporte.',
        'info'
      );
      return;
    }

    const filtro = {
      idProducto: this.tipoReporte === 'producto'
        ? this.idProductoReporte || undefined
        : undefined,
      idFamilia: this.tipoReporte === 'familia'
        ? this.idFamiliaReporte || undefined
        : undefined,
      idArticulo: this.tipoReporte === 'insumo'
        ? this.idArticuloReporte || undefined
        : undefined
    };
    this.cargando = true;
    this.recetaService.reporte(filtro).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo consultar el reporte.',
            'error'
          );
          return;
        }
        this.reporte = response.Data || [];
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo consultar el reporte.');
      }
    });
  }

  exportarReporte(): void {
    if (this.reporte.length === 0) {
      Swal.fire('Reporte', 'No hay datos para exportar.', 'info');
      return;
    }

    const filas = this.reporte.map(item => ({
      Producto: item.Producto,
      'Costo mesa': item.CostoMesa,
      'Costo llevar': item.CostoLlevar,
      'Costo delivery': item.CostoDelivery,
      Artículo: item.Articulo,
      Unidad: item.Unidad,
      Tipo: item.Tipo,
      Factor: item.Factor,
      'Cantidad mesa': item.CantidadMesa,
      'Cantidad llevar': item.CantidadLlevar,
      'Cantidad delivery': item.CantidadDelivery,
      Precio: item.Precio,
      Área: item.Area
    }));
    const worksheet = XLSX.utils.json_to_sheet(filas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recetas');
    XLSX.writeFile(workbook, 'ReporteRecetas.xlsx');
  }

  agregarDetalle(): void {
    const articulo = this.articuloSeleccionado();
    const area = this.areas.find(
      item => item.IdArea === this.detalleActual.IdArea
    );
    if (!articulo || !area) {
      Swal.fire(
        'Validación',
        'Seleccione el artículo y el área de descarga.',
        'info'
      );
      return;
    }

    if (this.detalleActual.TipoUnidad === 2 &&
        (!articulo.IdUnidadReceta || articulo.FactorReceta <= 0)) {
      Swal.fire(
        'Validación',
        'El artículo no tiene configurada una unidad de receta válida.',
        'info'
      );
      return;
    }

    const cantidades = [
      Number(this.detalleActual.CantidadMesa || 0),
      Number(this.detalleActual.CantidadLlevar || 0),
      Number(this.detalleActual.CantidadDelivery || 0)
    ];
    if (cantidades.some(cantidad => cantidad < 0) ||
        cantidades.every(cantidad => cantidad === 0)) {
      Swal.fire(
        'Validación',
        'Indique al menos una cantidad mayor que cero.',
        'info'
      );
      return;
    }

    const duplicado = this.detalles.findIndex(
      (detalle, index) =>
        detalle.IdArticulo === articulo.IdProducto &&
        index !== this.indiceDetalleEditado
    );
    if (duplicado >= 0) {
      Swal.fire(
        'Validación',
        'El artículo ya forma parte de la receta.',
        'info'
      );
      return;
    }

    const tipoUnidad = this.detalleActual.TipoUnidad;
    const precioCompra = Number(
      articulo.PrecioCompra ?? articulo.Precio ?? 0
    );
    const detalle: RecetaDetalle = {
      IdArticulo: articulo.IdProducto,
      Articulo: articulo.DescripcionCompra || articulo.Descripcion,
      IdUnidad: tipoUnidad === 1
        ? Number(articulo.IdUnidadStock)
        : Number(articulo.IdUnidadReceta),
      Unidad: tipoUnidad === 1
        ? articulo.UnidadStock
        : articulo.UnidadReceta,
      TipoUnidad: tipoUnidad,
      Factor: tipoUnidad === 1 ? 1 : articulo.FactorReceta,
      Precio: tipoUnidad === 1
        ? precioCompra
        : this.redondear(precioCompra / articulo.FactorReceta, 4),
      CantidadMesa: cantidades[0],
      CantidadLlevar: cantidades[1],
      CantidadDelivery: cantidades[2],
      IdArea: area.IdArea,
      Area: area.Descripcion
    };

    if (this.indiceDetalleEditado === null) {
      this.detalles = [...this.detalles, detalle];
    } else {
      const nuevos = [...this.detalles];
      nuevos[this.indiceDetalleEditado] = detalle;
      this.detalles = nuevos;
    }

    this.cancelarDetalle();
  }

  nuevoArticulo(): void {
    const reference = this.dialog.open(ArticuloMantenimientoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: 'calc(100vw - 48px)',
      height: 'calc(100vh - 48px)',
      maxWidth: '1080px',
      maxHeight: '820px',
      panelClass: 'dialog-window--workspace',
      data: { creacionRapida: true }
    });

    reference.afterClosed().subscribe((articulo: Articulo | undefined) => {
      if (!articulo) {
        return;
      }

      if (!articulo.Activo) {
        Swal.fire(
          'Artículo creado',
          'Está inactivo y no puede formar parte de una receta.',
          'info'
        );
        return;
      }

      this.articulos = [
        ...this.articulos.filter(
          item => item.IdProducto !== articulo.IdProducto
        ),
        articulo
      ].sort((a, b) =>
        (a.DescripcionCompra || a.Descripcion)
          .localeCompare(b.DescripcionCompra || b.Descripcion)
      );
      this.detalleActual.IdArticulo = articulo.IdProducto;
      this.detalleActual.TipoUnidad = 1;
    });
  }

  editarDetalle(index: number): void {
    const detalle = this.detalles[index];
    this.indiceDetalleEditado = index;
    this.detalleActual = {
      IdArticulo: detalle.IdArticulo,
      TipoUnidad: detalle.TipoUnidad,
      CantidadMesa: detalle.CantidadMesa,
      CantidadLlevar: detalle.CantidadLlevar,
      CantidadDelivery: detalle.CantidadDelivery,
      IdArea: detalle.IdArea
    };
  }

  eliminarDetalle(index: number): void {
    this.detalles = this.detalles.filter((_, i) => i !== index);
    if (this.indiceDetalleEditado === index) {
      this.cancelarDetalle();
    }
  }

  cancelarDetalle(): void {
    this.detalleActual = this.nuevoDetalle();
    this.indiceDetalleEditado = null;
  }

  guardar(): void {
    if (!this.recetaSeleccionada || this.detalles.length === 0) {
      Swal.fire(
        'Validación',
        'La receta debe contener al menos un artículo.',
        'info'
      );
      return;
    }

    const dto: RecetaGuardar = {
      IdProducto: this.recetaSeleccionada.IdProducto,
      Detalles: this.detalles.map(detalle => ({
        IdArticulo: detalle.IdArticulo,
        TipoUnidad: detalle.TipoUnidad,
        CantidadMesa: detalle.CantidadMesa,
        CantidadLlevar: detalle.CantidadLlevar,
        CantidadDelivery: detalle.CantidadDelivery,
        IdArea: detalle.IdArea
      }))
    };
    const idReceta = this.recetaSeleccionada.IdReceta;
    const request = idReceta
      ? this.recetaService.actualizar(idReceta, dto)
      : this.recetaService.crear(dto);

    this.guardando = true;
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo guardar la receta.',
            'error'
          );
          return;
        }
        Notificar.exito(idReceta ? 'Receta actualizada' : 'Receta creada',
          'Los costes fueron recalculados correctamente.');
        this.volver();
        this.cargarRecetas();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar la receta.');
      }
    });
  }

  eliminar(row: RecetaResumen): void {
    if (!row.IdReceta) {
      return;
    }

    Swal.fire({
      title: '¿Eliminar receta?',
      text: `El producto ${row.Producto} quedará disponible como “Sin receta”.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !row.IdReceta) {
        return;
      }

      this.recetaService.eliminar(row.IdReceta).subscribe({
        next: response => {
          if (!response.Success) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo eliminar la receta.',
              'error'
            );
            return;
          }
          Notificar.exito('Receta eliminada', '');
          this.cargarRecetas();
        },
        error: error => {
          this.mostrarError(error, 'No se pudo eliminar la receta.');
        }
      });
    });
  }

  volver(): void {
    this.showForm = false;
    this.recetaSeleccionada = null;
    this.detalles = [];
    this.cancelarDetalle();
  }

  volverReporte(): void {
    this.showReport = false;
    this.reporte = [];
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  articuloSeleccionado(): Articulo | undefined {
    return this.articulos.find(
      articulo => articulo.IdProducto === this.detalleActual.IdArticulo
    );
  }

  tieneUnidadReceta(): boolean {
    const articulo = this.articuloSeleccionado();
    return !!articulo?.IdUnidadReceta && articulo.FactorReceta > 0;
  }

  costo(canal: 'mesa' | 'llevar' | 'delivery'): number {
    return this.redondear(this.detalles.reduce((total, detalle) => {
      const cantidad = canal === 'mesa'
        ? detalle.CantidadMesa
        : canal === 'llevar'
          ? detalle.CantidadLlevar
          : detalle.CantidadDelivery;
      return total + (Number(detalle.Precio) * Number(cantidad));
    }, 0), 3);
  }

  porcentaje(costo: number): number {
    const precio = Number(this.recetaSeleccionada?.PrecioVenta || 0);
    return precio > 0
      ? this.redondear((costo / precio) * 100, 2)
      : 0;
  }

  private cargarRecetas(): void {
    this.cargando = true;
    this.recetaService.listar().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudieron cargar las recetas.',
            'error'
          );
          return;
        }
        this.recetas = response.Data || [];
        this.dataSource.data = this.recetas;
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar las recetas.');
      }
    });
  }

  private nuevoDetalle(): RecetaDetalleGuardar {
    return {
      IdArticulo: null,
      TipoUnidad: 1,
      CantidadMesa: 0,
      CantidadLlevar: 0,
      CantidadDelivery: 0,
      IdArea: null
    };
  }

  private normalizar(value: unknown): string {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  private redondear(value: number, decimales: number): number {
    const factor = 10 ** decimales;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire(
      'Error',
      error?.error?.Message || error?.error?.message || fallback,
      'error'
    );
  }
}
