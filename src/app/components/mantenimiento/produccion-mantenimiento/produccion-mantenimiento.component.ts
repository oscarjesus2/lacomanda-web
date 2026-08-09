import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  Produccion, ProduccionCatalogos, ProduccionProducto, ProduccionResumen,
  RecetaProduccion, RecetaProduccionResumen
} from 'src/app/models/produccion.models';
import { ProduccionService } from 'src/app/services/produccion.service';

type Vista = 'lista' | 'produccion' | 'receta';
type Seccion = 'producciones' | 'recetas';

interface LineaProduccion {
  IdRecetaProduccion: number; Producto: string; Unidad: string; Cantidad: number;
  IdSubAreaAlmacen: number; SubArea: string; CostoUnitario: number;
}

interface LineaReceta {
  IdProductoInsumo: number; Producto: string; TipoUnidad: number; Unidad: string;
  Cantidad: number; IdSubAreaAlmacen: number; SubArea: string; Precio: number; Costo: number;
}

@Component({
  selector: 'app-produccion-mantenimiento',
  templateUrl: './produccion-mantenimiento.component.html'
})
export class ProduccionMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      if (this.seccion === 'producciones') {
        this.producciones.paginator = value;
      } else {
        this.recetas.paginator = value;
      }
    }
  }

  readonly columnasProduccion = ['numero', 'fecha', 'responsable', 'lineas', 'estado', 'acciones'];
  readonly columnasReceta = ['producto', 'unidad', 'insumos', 'costo', 'acciones'];
  producciones = new MatTableDataSource<ProduccionResumen>([]);
  recetas = new MatTableDataSource<RecetaProduccionResumen>([]);
  catalogos: ProduccionCatalogos | null = null;
  produccion: Produccion | null = null;
  receta: RecetaProduccion | null = null;
  vista: Vista = 'lista';
  seccion: Seccion = 'producciones';
  cargando = false;
  guardando = false;

  filtro = { FechaInicio: this.inicioMes(), FechaFin: new Date(), Estado: null as number | null, Buscar: '' };
  formularioProduccion = { Fecha: new Date(), IdUsuarioResponsable: 0 };
  lineasProduccion: LineaProduccion[] = [];
  recetaAgregar: number | null = null;
  cantidadAgregar = 1;
  destinoAgregar: number | null = null;

  productoProducido = 0;
  lineasReceta: LineaReceta[] = [];
  insumoAgregar: number | null = null;
  tipoUnidadAgregar = 1;
  cantidadInsumoAgregar = 1;
  subAreaInsumoAgregar: number | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<ProduccionMantenimientoComponent>,
    private readonly service: ProduccionService
  ) {}

  ngOnInit(): void { this.cargarInicial(); }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({
      catalogos: this.service.catalogos(),
      producciones: this.service.listar(this.filtro),
      recetas: this.service.listarRecetas()
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.catalogos.Success || !response.producciones.Success || !response.recetas.Success) {
          Swal.fire('No se pudo iniciar', 'No se pudieron cargar los datos de producción.', 'error');
          return;
        }
        this.catalogos = response.catalogos.Data;
        this.producciones.data = response.producciones.Data || [];
        this.recetas.data = response.recetas.Data || [];
      },
      error: error => { this.cargando = false; this.error(error, 'No se pudo cargar producción.'); }
    });
  }

  cambiarSeccion(seccion: Seccion): void {
    this.seccion = seccion;
    setTimeout(() => (seccion === 'producciones' ? this.producciones : this.recetas).paginator?.firstPage());
  }

  buscar(): void {
    this.cargando = true;
    this.service.listar(this.filtro).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) { Swal.fire('Error', response.Message, 'error'); return; }
        this.producciones.data = response.Data || [];
        this.producciones.paginator?.firstPage();
      },
      error: error => { this.cargando = false; this.error(error, 'No se pudo realizar la búsqueda.'); }
    });
  }

  nuevaProduccion(): void {
    this.produccion = null;
    this.formularioProduccion = { Fecha: new Date(), IdUsuarioResponsable: this.catalogos?.Usuarios[0]?.Id || 0 };
    this.lineasProduccion = [];
    this.limpiarAgregarProduccion();
    this.vista = 'produccion';
  }

  abrirProduccion(row: ProduccionResumen): void {
    this.cargando = true;
    this.service.obtener(row.IdProduccion).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) { Swal.fire('Error', response.Message, 'error'); return; }
        this.cargarProduccion(response.Data);
      },
      error: error => { this.cargando = false; this.error(error, 'No se pudo abrir la producción.'); }
    });
  }

  agregarProduccion(): void {
    const receta = this.catalogos?.Recetas.find(x => x.IdRecetaProduccion === Number(this.recetaAgregar));
    const subarea = this.catalogos?.SubAreas.find(x => x.Id === Number(this.destinoAgregar));
    if (!receta || !subarea || Number(this.cantidadAgregar) <= 0) {
      Swal.fire('Complete la línea', 'Seleccione receta, destino y una cantidad mayor que cero.', 'info'); return;
    }
    if (this.lineasProduccion.some(x => x.IdRecetaProduccion === receta.IdRecetaProduccion && x.IdSubAreaAlmacen === subarea.Id)) {
      Swal.fire('Línea repetida', 'La receta ya fue agregada con ese destino.', 'info'); return;
    }
    this.lineasProduccion = [...this.lineasProduccion, {
      IdRecetaProduccion: receta.IdRecetaProduccion, Producto: receta.ProductoProducido,
      Unidad: receta.UnidadProducida, Cantidad: Number(this.cantidadAgregar),
      IdSubAreaAlmacen: subarea.Id, SubArea: subarea.Descripcion, CostoUnitario: receta.Costo
    }];
    this.limpiarAgregarProduccion();
  }

  quitarProduccion(index: number): void { this.lineasProduccion.splice(index, 1); this.lineasProduccion = [...this.lineasProduccion]; }

  guardarProduccion(): void {
    if (!this.formularioProduccion.Fecha || !this.formularioProduccion.IdUsuarioResponsable || !this.lineasProduccion.length) {
      Swal.fire('Complete la producción', 'Indique fecha, responsable y al menos una receta.', 'info'); return;
    }
    const dto = {
      Fecha: this.formularioProduccion.Fecha,
      IdUsuarioResponsable: Number(this.formularioProduccion.IdUsuarioResponsable),
      Detalles: this.lineasProduccion.map(x => ({
        IdRecetaProduccion: x.IdRecetaProduccion, Cantidad: Number(x.Cantidad), IdSubAreaAlmacen: x.IdSubAreaAlmacen
      }))
    };
    this.guardando = true;
    const request = this.produccion ? this.service.actualizar(this.produccion.IdProduccion, dto) : this.service.crear(dto);
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) { Swal.fire('No se pudo guardar', response.Message, 'error'); return; }
        this.cargarProduccion(response.Data);
        Swal.fire('Producción guardada', 'Quedó generada y todavía no afecta el stock.', 'success');
      },
      error: error => { this.guardando = false; this.error(error, 'No se pudo guardar la producción.'); }
    });
  }

  revisar(): void {
    if (!this.produccion || this.produccion.Estado !== 1) { return; }
    Swal.fire({
      title: 'Revisar producción',
      text: 'Se consumirán los insumos, ingresarán los productos terminados y se registrará el Kardex.',
      icon: 'question', showCancelButton: true, confirmButtonText: 'Revisar y actualizar stock', cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed && this.produccion) {
        this.ejecutarAccion(this.service.revisar(this.produccion.IdProduccion), 'Producción revisada');
      }
    });
  }

  anular(): void {
    if (!this.produccion || this.produccion.Estado === 3) { return; }
    const revisada = this.produccion.Estado === 2;
    Swal.fire({
      title: 'Anular producción',
      text: revisada
        ? 'Se retirará el producto terminado, se repondrán los insumos y se anulará su Kardex.'
        : 'La producción generada se anulará sin afectar existencias.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Anular producción', cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed && this.produccion) {
        this.ejecutarAccion(this.service.anular(this.produccion.IdProduccion), 'Producción anulada');
      }
    });
  }

  nuevaReceta(): void {
    this.receta = null;
    this.productoProducido = this.productosProducidosDisponibles[0]?.IdProducto || 0;
    this.lineasReceta = [];
    this.limpiarAgregarReceta();
    this.vista = 'receta';
  }

  abrirReceta(row: RecetaProduccionResumen): void {
    this.cargando = true;
    this.service.obtenerReceta(row.IdRecetaProduccion).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) { Swal.fire('Error', response.Message, 'error'); return; }
        this.cargarReceta(response.Data);
      },
      error: error => { this.cargando = false; this.error(error, 'No se pudo abrir la receta.'); }
    });
  }

  cambiarInsumo(): void {
    if (!this.insumoSeleccionado?.IdUnidadReceta) { this.tipoUnidadAgregar = 1; }
  }

  agregarInsumo(): void {
    const producto = this.insumoSeleccionado;
    const subarea = this.catalogos?.SubAreas.find(x => x.Id === Number(this.subAreaInsumoAgregar));
    if (!producto || !subarea || Number(this.cantidadInsumoAgregar) <= 0) {
      Swal.fire('Complete el insumo', 'Seleccione insumo, subárea y una cantidad mayor que cero.', 'info'); return;
    }
    if (this.lineasReceta.some(x => x.IdProductoInsumo === producto.IdProducto)) {
      Swal.fire('Insumo repetido', 'Cada insumo puede aparecer una sola vez.', 'info'); return;
    }
    const precio = this.tipoUnidadAgregar === 2 ? producto.PrecioCompra / Number(producto.FactorReceta || 1) : producto.PrecioCompra;
    const cantidad = Number(this.cantidadInsumoAgregar);
    this.lineasReceta = [...this.lineasReceta, {
      IdProductoInsumo: producto.IdProducto, Producto: producto.Descripcion, TipoUnidad: this.tipoUnidadAgregar,
      Unidad: this.tipoUnidadAgregar === 2 ? producto.UnidadReceta : producto.UnidadStock,
      Cantidad: cantidad, IdSubAreaAlmacen: subarea.Id, SubArea: subarea.Descripcion,
      Precio: precio, Costo: precio * cantidad
    }];
    this.limpiarAgregarReceta();
  }

  quitarInsumo(index: number): void { this.lineasReceta.splice(index, 1); this.lineasReceta = [...this.lineasReceta]; }

  guardarReceta(): void {
    if (!this.productoProducido || !this.lineasReceta.length) {
      Swal.fire('Complete la receta', 'Seleccione el producto obtenido y agregue sus insumos.', 'info'); return;
    }
    const dto = {
      IdProductoProducido: Number(this.productoProducido),
      Detalles: this.lineasReceta.map(x => ({
        IdProductoInsumo: x.IdProductoInsumo, TipoUnidad: x.TipoUnidad,
        Cantidad: Number(x.Cantidad), IdSubAreaAlmacen: x.IdSubAreaAlmacen
      }))
    };
    this.guardando = true;
    const request = this.receta ? this.service.actualizarReceta(this.receta.IdRecetaProduccion, dto) : this.service.crearReceta(dto);
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) { Swal.fire('No se pudo guardar', response.Message, 'error'); return; }
        this.cargarReceta(response.Data);
        this.recargarCatalogosYRecetas();
        Swal.fire('Receta guardada', 'El costo del producto terminado fue recalculado.', 'success');
      },
      error: error => { this.guardando = false; this.error(error, 'No se pudo guardar la receta.'); }
    });
  }

  volver(): void { this.vista = 'lista'; this.produccion = null; this.receta = null; this.cargarInicial(); }
  cerrar(): void { this.dialogRef.close(); }

  get soloLecturaProduccion(): boolean { return !!this.produccion && this.produccion.Estado !== 1; }

  get productosProducidosDisponibles(): ProduccionProducto[] {
    const asignados = new Set((this.catalogos?.Recetas || [])
      .filter(x => !this.receta || x.IdRecetaProduccion !== this.receta.IdRecetaProduccion)
      .map(x => x.IdProductoProducido));
    return (this.catalogos?.Productos || []).filter(x => x.Produccion && !asignados.has(x.IdProducto));
  }

  get insumosDisponibles(): ProduccionProducto[] {
    const agregados = new Set(this.lineasReceta.map(x => x.IdProductoInsumo));
    return (this.catalogos?.Productos || []).filter(x => x.IdProducto !== Number(this.productoProducido) && !agregados.has(x.IdProducto));
  }

  get insumoSeleccionado(): ProduccionProducto | undefined {
    return this.catalogos?.Productos.find(x => x.IdProducto === Number(this.insumoAgregar));
  }

  get costoReceta(): number { return this.lineasReceta.reduce((total, x) => total + Number(x.Costo || 0), 0); }
  get costoProduccion(): number { return this.lineasProduccion.reduce((total, x) => total + x.CostoUnitario * x.Cantidad, 0); }

  private cargarProduccion(item: Produccion): void {
    this.produccion = item;
    this.formularioProduccion = { Fecha: new Date(item.Fecha), IdUsuarioResponsable: item.IdUsuarioResponsable };
    this.lineasProduccion = item.Detalles.map(x => {
      const receta = this.catalogos?.Recetas.find(r => r.IdRecetaProduccion === x.IdRecetaProduccion);
      return {
        IdRecetaProduccion: x.IdRecetaProduccion, Producto: x.ProductoProducido,
        Unidad: x.UnidadMedida || receta?.UnidadProducida || '', Cantidad: x.Cantidad,
        IdSubAreaAlmacen: x.IdSubAreaAlmacen, SubArea: x.SubAreaAlmacen, CostoUnitario: x.CostoUnitario
      };
    });
    this.vista = 'produccion';
  }

  private cargarReceta(item: RecetaProduccion): void {
    this.receta = item;
    this.productoProducido = item.IdProductoProducido;
    this.lineasReceta = item.Detalles.map(x => {
      const producto = this.catalogos?.Productos.find(p => p.IdProducto === x.IdProductoInsumo);
      return {
        IdProductoInsumo: x.IdProductoInsumo, Producto: x.ProductoInsumo, TipoUnidad: x.TipoUnidad,
        Unidad: x.UnidadMedida || (x.TipoUnidad === 2 ? producto?.UnidadReceta : producto?.UnidadStock) || '',
        Cantidad: x.Cantidad, IdSubAreaAlmacen: x.IdSubAreaAlmacen, SubArea: x.SubAreaAlmacen,
        Precio: x.Precio, Costo: x.Costo
      };
    });
    this.vista = 'receta';
  }

  private ejecutarAccion(request: Observable<ApiResponse<Produccion>>, titulo: string): void {
    this.guardando = true;
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) { Swal.fire('No se pudo completar', response.Message, 'error'); return; }
        this.cargarProduccion(response.Data);
        Swal.fire(titulo, response.Message, 'success');
      },
      error: error => { this.guardando = false; this.error(error, 'No se pudo completar la operación.'); }
    });
  }

  private recargarCatalogosYRecetas(): void {
    forkJoin({ catalogos: this.service.catalogos(), recetas: this.service.listarRecetas() }).subscribe({
      next: response => {
        if (response.catalogos.Success) { this.catalogos = response.catalogos.Data; }
        if (response.recetas.Success) { this.recetas.data = response.recetas.Data || []; }
      }
    });
  }

  private limpiarAgregarProduccion(): void {
    this.recetaAgregar = null; this.cantidadAgregar = 1; this.destinoAgregar = this.catalogos?.SubAreas[0]?.Id || null;
  }

  private limpiarAgregarReceta(): void {
    this.insumoAgregar = null; this.tipoUnidadAgregar = 1; this.cantidadInsumoAgregar = 1;
    this.subAreaInsumoAgregar = this.catalogos?.SubAreas[0]?.Id || null;
  }

  private inicioMes(): Date { const hoy = new Date(); return new Date(hoy.getFullYear(), hoy.getMonth(), 1); }
  private error(error: any, fallback: string): void {
    Swal.fire('Error', error?.error?.Message || error?.error?.message || fallback, 'error');
  }
}
