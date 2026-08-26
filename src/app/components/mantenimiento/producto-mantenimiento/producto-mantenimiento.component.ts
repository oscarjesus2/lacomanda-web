import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { Producto } from 'src/app/models/product.models';
import { ProductoService } from 'src/app/services/product.service';
import { PosicionSelectorDialogComponent, PosicionSelectorData } from '../../posicion-selector-dialog/posicion-selector-dialog.component';

import { Familia } from 'src/app/models/familia.models';
import { SubFamilia } from 'src/app/models/subfamilia.models';
import { Color } from 'src/app/models/color.models';
import { Moneda } from 'src/app/models/moneda.models';
import { Grupo } from 'src/app/models/grupo.models';
import { SeccionMenu } from 'src/app/models/seccionMenu.models';
import { FamiliaService } from 'src/app/services/familia.service';
import { ColorService } from 'src/app/services/color.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { SeccionMenuService } from 'src/app/services/clasecombo.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { ImpuestoPaisService } from 'src/app/services/impuestopais.service';
import { ImpuestoPais } from 'src/app/models/impuestopais.models';
import { AreaImpresionService } from 'src/app/services/area-impresion.service';
import { AreaImpresion } from 'src/app/models/area-impresion.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { UnidadMedida } from 'src/app/models/articulo.models';
import { UnidadMedidaService } from 'src/app/services/unidad-medida.service';
import { Notificar } from 'src/app/shared/notificaciones';
import { ImportacionCartaIaService } from 'src/app/services/importacion-carta-ia.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import {
  CartaIaPrevisualizacion,
  CartaIaProducto,
} from 'src/app/models/importacion-carta-ia.models';

@Component({
  selector: 'app-producto-mantenimiento',
  templateUrl: './producto-mantenimiento.component.html',
  styleUrls: ['./producto-mantenimiento.component.css']
})
export class ProductoMantenimientoComponent implements OnInit {
  @ViewChild('productoForm') productoForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.filtered.paginator = value;
    }
  }

  showForm = false;
  mostrarConfiguracionAvanzada = false;
  private configuracionAvanzadaHabilitada = false;
  productos: Producto[] = [];
  filtered = new MatTableDataSource<Producto>([]);
  filtro = '';
  puedeImportarCartaIa = false;
  procesandoCartaIa = false;
  confirmandoCartaIa = false;
  previsualizacionCarta: CartaIaPrevisualizacion | null = null;

  // catálogos
  colores: Color[] = [];
  monedas: Moneda[] = [];
  familias: Familia[] = [];
  subfamilias: SubFamilia[] = [];
  grupos: Grupo[] = [];
  gruposAlmacen: Grupo[] = [];
  unidadesMedida: UnidadMedida[] = [];
  impuestoPais: ImpuestoPais[] = [];
  seccionMenu: SeccionMenu[] = [];

  // actual
  p: Producto = new Producto({InsumoProducto:'P'});
  areas: AreaImpresion[] = [];
  selectedAreas: number[] = [];

  // Visibilidad de campos según la configuración del negocio
  mostrarAnfitriona = false;       // config.Anfitrionas
  mostrarTragoCortesia = false;    // config.TieneDescuentoTragoCortesia

  displayedColumns: string[] = ['nombre', 'descripcion', 'precio', 'tipo', 'visible', 'activo', 'posicion', 'actions'];

  // grids (parametrizable)
  readonly GRID_POS_ROWS = 10;
  readonly GRID_POS_COLS = 8;
  readonly GRID_POSCOMP_ROWS = 6;
  readonly GRID_POSCOMP_COLS = 5;

  constructor(
    private dialogRef: MatDialogRef<ProductoMantenimientoComponent>,
    private dialog: MatDialog,
    private productoService: ProductoService,
    private familiaService: FamiliaService,
    private colorService: ColorService,
    private monedaService: MonedaService,
    private claseComboService: SeccionMenuService,
    private grupoService: GrupoService,
    private impuestoPaisService: ImpuestoPaisService,
    private spinner: NgxSpinnerService,
    private areaSrv: AreaImpresionService,
    private configuracionService: ConfiguracionService,
    private unidadMedidaService: UnidadMedidaService,
    private importacionCartaIaService: ImportacionCartaIaService,
    private licenciaTenantService: LicenciaTenantService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
    this.cargarAreasImpresion();
    this.cargarConfiguracion();
    this.cargarAccesoImportacionCartaIa();
  }

  private cargarAccesoImportacionCartaIa(): void {
    this.licenciaTenantService
      .tieneCaracteristica(
        CARACTERISTICAS_LICENCIA.ProductosImportacionCartaIa,
      )
      .subscribe(habilitada => this.puedeImportarCartaIa = habilitada);
  }

  /** Determina qué campos opcionales se muestran según la configuración. */
  private cargarConfiguracion(): void {
    this.configuracionService.get().subscribe({
      next: (cfg) => {
        this.mostrarAnfitriona = !!cfg?.Anfitrionas;
        this.mostrarTragoCortesia = !!cfg?.TieneDescuentoTragoCortesia;
      },
      error: () => {}
    });
  }
  cargarTodo(): void {
    this.spinner.show();
    this.productoService.getAllProductos().subscribe({
      next: (res) => {
        if (res.Success) {
          this.productos = res.Data || [];
          this.filtered.data = this.productos;
        } else {
          Swal.fire('Error', res.Message || 'Error al cargar productos', 'error');
        }
        this.spinner.hide();
      }, error: () => { this.spinner.hide(); Swal.fire('Error', 'No se pudo cargar productos', 'error'); }
    });

    this.colorService.getColores().subscribe(r => { if (r.Success) this.colores = r.Data; });
    this.monedaService.getMoneda().subscribe(r => { if (r.Success) this.monedas = r.Data; });
    this.familiaService.getFamilias().subscribe(r => { if (r.Success) this.familias = r.Data; });
    this.grupoService.getGrupos('P').subscribe(r => { if (r.Success) this.grupos = r.Data; });
    this.grupoService.getGrupos('A').subscribe(r => { if (r.Success) this.gruposAlmacen = r.Data; });
    this.unidadMedidaService.listar().subscribe(r => { if (r.Success) this.unidadesMedida = r.Data || []; });
    this.impuestoPaisService.getImpuestoPais().subscribe(r => {
      if (r.Success) {
        this.impuestoPais = r.Data || [];
        this.seleccionarImpuestoGeneralSiCorresponde();
      }
    });
    this.claseComboService.getSeccionMenu().subscribe(r => { if (r.Success) this.seccionMenu = r.Data; });
  }

  private cargarAreasImpresion(): void {
  this.areaSrv.listar().subscribe({
    next: list => this.areas = list,
    error: _ => this.areas = []
  });
}

  onFamiliaChange(): void {
  this.p.IdSubFamilia = undefined as any;
  if (this.p.IdFamilia) {
    this.familiaService.getSubFamilias().subscribe(r => {
      if (r.Success) {
        this.subfamilias = r.Data.filter(sf => sf.IdFamilia === this.p.IdFamilia);
      }
    });
  } else {
    this.subfamilias = [];
  }
}

  cambiarServicio(): void {
    if (this.p.EsServicio) {
      this.p.TieneReceta = false;
      this.p.ControlDirectoStock = false;
      this.limpiarAlmacenDirecto();
    }
  }

  cambiarControlReceta(): void {
    if (this.p.TieneReceta) {
      this.p.ControlDirectoStock = false;
      this.limpiarAlmacenDirecto();
    }
  }

  cambiarControlDirectoStock(): void {
    if (!this.p.ControlDirectoStock) {
      this.limpiarAlmacenDirecto();
    }
  }

  toggleConfiguracionAvanzada(): void {
    this.mostrarConfiguracionAvanzada =
      !this.mostrarConfiguracionAvanzada;

    if (this.mostrarConfiguracionAvanzada) {
      this.configuracionAvanzadaHabilitada = true;
      this.seleccionarImpuestoGeneralSiCorresponde();
    }
  }

  cambiarUnidadStock(): void {
    if (this.p.IdUnidadReceta === this.p.IdUnidadStock) {
      this.p.IdUnidadReceta = null;
      this.p.FactorReceta = 1;
    }
  }

  cambiarUnidadConsumo(): void {
    if (!this.usaConversionUnidad()) {
      this.p.FactorReceta = 1;
    }
  }

  usaConversionUnidad(): boolean {
    return !!this.p.IdUnidadReceta &&
      this.p.IdUnidadReceta !== this.p.IdUnidadStock;
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.filtered.data = this.productos.filter(x =>
      (x.NombreCorto || '').toLowerCase().includes(f) ||
      (x.Descripcion || '').toLowerCase().includes(f) ||
      String(x.Precio || '').includes(f) ||
      String(x.Posicion || '').includes(f) ||
      (x.Activo ? 'activo' : 'inactivo').includes(f)
    );
  }

  analizarCarta(event: Event): void {
    const input = event.target as HTMLInputElement;
    const imagenes = Array.from(input.files ?? []);
    input.value = '';

    if (imagenes.length === 0) {
      return;
    }

    if (imagenes.length > 8) {
      Swal.fire(
        'Demasiadas fotos',
        'Selecciona un máximo de 8 fotos por lectura.',
        'info',
      );
      return;
    }

    const tiposPermitidos = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
    if (imagenes.some(imagen =>
      !tiposPermitidos.has(imagen.type) || imagen.size > 8 * 1024 * 1024)) {
      Swal.fire(
        'Revisa las fotos',
        'Cada archivo debe ser JPG, PNG o WEBP y pesar como máximo 8 MB.',
        'info',
      );
      return;
    }

    this.procesandoCartaIa = true;
    this.spinner.show();
    this.importacionCartaIaService.previsualizar(imagenes).subscribe({
      next: respuesta => {
        this.procesandoCartaIa = false;
        this.spinner.hide();
        if (!respuesta.Success || !respuesta.Data) {
          Swal.fire(
            'No pudimos leer la carta',
            respuesta.Message || 'Prueba con fotos más nítidas y bien encuadradas.',
            'info',
          );
          return;
        }

        this.previsualizacionCarta = respuesta.Data;
      },
      error: error => {
        this.procesandoCartaIa = false;
        this.spinner.hide();
        Swal.fire(
          'No pudimos leer la carta',
          error?.error?.Message ||
            'Prueba con fotos más nítidas y bien encuadradas.',
          'error',
        );
      },
    });
  }

  cancelarImportacionCarta(): void {
    this.previsualizacionCarta = null;
  }

  confirmarImportacionCarta(): void {
    const previsualizacion = this.previsualizacionCarta;
    if (!previsualizacion || this.cantidadProductosSeleccionados === 0) {
      Swal.fire(
        'Selecciona productos',
        'Marca al menos un producto para crearlo.',
        'info',
      );
      return;
    }

    const incompletos = previsualizacion.Productos.some(producto =>
      producto.Seleccionado && (
        !producto.Familia?.trim() ||
        !producto.SubFamilia?.trim() ||
        !producto.NombreCorto?.trim() ||
        !producto.Descripcion?.trim() ||
        producto.Precio === null ||
        producto.Precio < 0
      ));
    if (incompletos) {
      Swal.fire(
        'Completa los datos pendientes',
        'Revisa familia, subfamilia, nombre, descripción y precio de los productos seleccionados.',
        'info',
      );
      return;
    }

    this.confirmandoCartaIa = true;
    this.spinner.show();
    this.importacionCartaIaService.confirmar({
      IdOperacion: previsualizacion.IdOperacion,
      Productos: previsualizacion.Productos,
    }).subscribe({
      next: respuesta => {
        this.confirmandoCartaIa = false;
        this.spinner.hide();
        if (!respuesta.Success || !respuesta.Data) {
          Swal.fire(
            'No se pudo completar la importación',
            respuesta.Message || 'Revisa los datos e inténtalo de nuevo.',
            'error',
          );
          return;
        }

        const resultado = respuesta.Data;
        this.previsualizacionCarta = null;
        this.cargarTodo();
        Swal.fire({
          icon: 'success',
          title: 'Carta importada',
          html:
            `<strong>${resultado.ProductosCreados}</strong> productos creados` +
            `<br>${resultado.FamiliasCreadas} familias y ` +
            `${resultado.SubFamiliasCreadas} subfamilias nuevas` +
            (resultado.DuplicadosOmitidos > 0
              ? `<br>${resultado.DuplicadosOmitidos} duplicados omitidos`
              : ''),
          confirmButtonText: 'Entendido',
        });
      },
      error: error => {
        this.confirmandoCartaIa = false;
        this.spinner.hide();
        Swal.fire(
          'No se pudo completar la importación',
          error?.error?.Message || 'Revisa los datos e inténtalo de nuevo.',
          'error',
        );
      },
    });
  }

  get cantidadProductosSeleccionados(): number {
    return this.previsualizacionCarta?.Productos
      .filter(producto => producto.Seleccionado).length ?? 0;
  }

  confianzaPorcentaje(producto?: CartaIaProducto): number {
    const confianza = producto?.Confianza ??
      this.previsualizacionCarta?.Confianza ?? 0;
    return Math.round(confianza * 100);
  }

  trackProductoCarta(index: number, producto: CartaIaProducto): string {
    return `${index}-${producto.NombreCorto}`;
  }

  nuevo(): void {
    this.resetForm();
    this.selectedAreas = [];
    this.showForm = true;
  }

  onEdit(row: Producto): void {
    this.p = {
      ...row,
      ControlDirectoStock:
        row.ControlDirectoStock ??
        !!(row.IdUnidadStock ||
           row.IdGrupoCompra)
    };
    // El panel es solo visual: editar con él plegado conserva los datos.
    this.configuracionAvanzadaHabilitada = true;
    this.mostrarConfiguracionAvanzada = false;
    // cargar subfamilias del valor actual
    if (this.p.IdFamilia) {
      this.familiaService.getSubFamilias()
      .subscribe(r => {
        if (r.Success) {
          this.subfamilias = (r.Data || []).filter(sf => sf.IdFamilia === this.p.IdFamilia);
          // (opcional, pero útil) si la subfamilia actual no pertenece a la familia, la limpiamos
          if (!this.subfamilias.some(sf => sf.IdSubFamilia === this.p.IdSubFamilia)) {
            this.p.IdSubFamilia = undefined as any;
          }
        }
      });
    }

    this.selectedAreas = (row.ProductoAreaImpresion || []).map(a => a.IdAreaImpresion);


    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?', text: 'No podrás revertir esto!', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar!', cancelButtonText: 'No, cancelar!'
    }).then(s => {
      if (s.isConfirmed) {
        this.productoService.eliminar(id).subscribe({
          next: (res) => {
            if (!res.Success) { Swal.fire('Error', res.Message || 'No se pudo eliminar', 'error'); return; }
            this.cargarTodo(); Notificar.exito('Producto eliminado', '');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  abrirSelectorPosicion(): void {
    const ocupadas = this.productos
      .filter(x => x.IdProducto !== this.p.IdProducto)
      .map(x => x.Posicion);

    const data: PosicionSelectorData = {
      rows: this.GRID_POS_ROWS, cols: this.GRID_POS_COLS,
      occupied: ocupadas, initial: this.p.Posicion || null
    };

    const ref = this.dialog.open(PosicionSelectorDialogComponent, { width: '720px', data });
    ref.afterClosed().subscribe((pos: number | null) => { if (pos) this.p.Posicion = pos; });
  }

  abrirSelectorPosicionComplemento(): void {
    if (this.p.Tipo !== 3) { return; }
    const ocupadas = this.productos
      .filter(x => x.IdProducto !== this.p.IdProducto && x.Tipo === 3)
      .map(x => x.PosicionComplemento);

    const data: PosicionSelectorData = {
      rows: this.GRID_POSCOMP_ROWS, cols: this.GRID_POSCOMP_COLS,
      occupied: ocupadas, initial: this.p.PosicionComplemento || null
    };

    const ref = this.dialog.open(PosicionSelectorDialogComponent, { width: '620px', data });
    ref.afterClosed().subscribe((pos: number | null) => { if (pos) this.p.PosicionComplemento = pos; });
  }

  private markTouched(form: NgForm): void {
    Object.values(form.controls).forEach(c => { c.markAsTouched(); c.markAsDirty(); });
  }

  onSubmit(): void {
    // Validaciones condicionales (front). El back valida también.
    if (!this.p.Posicion) { Swal.fire('Validación', 'Debe elegir la Posición (8×9).', 'info'); return; }

    if (this.configuracionAvanzadaHabilitada &&
        this.p.SinPrecio &&
        (!this.p.PrecioMinimo || this.p.PrecioMinimo <= 0)) {
      Swal.fire('Validación', 'Cuando “SinPrecio” es verdadero, PrecioMinimo es obligatorio y > 0.', 'info'); return;
    }

    if (this.p.Tipo === 1) {
      if (this.p.IdClaseCombo === undefined || this.p.IdClaseCombo === null) {
        Swal.fire('Validación', 'Seleccione Combo principal o una sección del menú.', 'info'); return;
      }
    } else if (this.p.Tipo === 2) {
      if (!this.p.Qty || this.p.Qty <= 0) {
        Swal.fire('Validación', 'Para Tipo=2 (Con complementos) debe ingresar Qty de complementos (>0).', 'info'); return;
      }
    } else if (this.p.Tipo === 3) {
      if (!this.p.FactorComplemento || this.p.FactorComplemento <= 0) {
        Swal.fire('Validación', 'Para Tipo=3 (Complemento) debe ingresar FactorComplemento (>0).', 'info'); return;
      }
      if (!this.p.PosicionComplemento) {
        Swal.fire('Validación', 'Para Tipo=3 (Complemento) debe elegir PosiciónComplemento (6×5).', 'info'); return;
      }
    }

    if (this.configuracionAvanzadaHabilitada &&
        this.p.ControlDirectoStock) {
      if (!this.p.IdGrupoCompra ||
          !this.p.IdUnidadStock) {
        Swal.fire(
          'Validación',
          'Los productos sin receta necesitan grupo de almacén y unidad de compra/stock.',
          'info'
        );
        return;
      }

      if ((this.p.PrecioCompra || 0) < 0 ||
          (this.p.StockMinimo || 0) < 0 ||
          (this.p.StockMaximo || 0) < 0) {
        Swal.fire(
          'Validación',
          'El precio de compra y los límites de stock no pueden ser negativos.',
          'info'
        );
        return;
      }

      if ((this.p.StockMaximo || 0) < (this.p.StockMinimo || 0)) {
        Swal.fire(
          'Validación',
          'El stock máximo no puede ser menor que el stock mínimo.',
          'info'
        );
        return;
      }

      if (this.usaConversionUnidad() &&
          (!this.p.FactorReceta || this.p.FactorReceta <= 0)) {
        Swal.fire(
          'Validación',
          'Indique cuántas unidades de consumo contiene cada unidad de compra.',
          'info'
        );
        return;
      }
    }

    if (this.productoForm.invalid) { this.markTouched(this.productoForm); return; }
    this.p.InsumoProducto='P';

    const payload: any = {
      ...this.p,
      IdSeccionMenu: this.p.IdClaseCombo ?? 0,
      ConfiguracionAvanzada:
        this.configuracionAvanzadaHabilitada,
      ControlDirectoStock: !!this.p.ControlDirectoStock,
      AreasImpresionIds: this.selectedAreas
    };


    const obs = this.p.IdProducto ? this.productoService.actualizar(payload) : this.productoService.crear(payload);

    obs.subscribe({
      next: (res) => {
        if (!res.Success) { Swal.fire('Error', res.Message || 'Operación no realizada', 'error'); return; }
        this.cargarTodo(); this.showForm = false;
        Notificar.exito('Ok', this.p.IdProducto ? 'Producto actualizado' : 'Producto creado');
      },
    });
  }

  cancelar(): void { this.resetForm(); this.cargarTodo(); this.showForm = false; }

  resetForm(): void {
    this.p = new Producto();
    this.mostrarConfiguracionAvanzada = false;
    this.configuracionAvanzadaHabilitada = false;
    this.p.Visible = true; this.p.Activo = true; this.p.IdImpuestoPais = ''; this.p.Tipo = 0;
    this.p.EsServicio = false;
    this.p.SinPrecio = false;
    this.p.InsumoProducto = 'P';
    // Valores por defecto para los campos condicionados por configuración
    this.p.ExclusivoParaAnfitriona = false;
    this.p.PermitirParaTragoCortesia = false;
    this.p.TieneReceta = false;
    this.p.IdUnidadStock = null;
    this.p.IdUnidadReceta = null;
    this.p.FactorReceta = 1;
    this.p.IdGrupoCompra = null;
    this.p.DescripcionCompra = '';
    this.p.PrecioCompra = 0;
    this.p.StockMinimo = 0;
    this.p.StockMaximo = 0;
    this.p.Inventario = false;
    this.p.ControlDirectoStock = false;
    this.selectedAreas = [];
    this.seleccionarImpuestoGeneralSiCorresponde();
  }

  private limpiarAlmacenDirecto(): void {
    this.p.IdUnidadStock = null;
    this.p.IdUnidadReceta = null;
    this.p.FactorReceta = 1;
    this.p.IdGrupoCompra = null;
    this.p.DescripcionCompra = '';
    this.p.PrecioCompra = 0;
    this.p.StockMinimo = 0;
    this.p.StockMaximo = 0;
    this.p.Inventario = false;
  }

  private seleccionarImpuestoGeneralSiCorresponde(): void {
    if (this.p?.IdImpuestoPais) {
      return;
    }

    const impuestoGeneral = this.impuestoPais.find(
      impuesto => impuesto.Activo && impuesto.ImpuestoGeneral
    );
    if (impuestoGeneral) {
      this.p.IdImpuestoPais = impuestoGeneral.IdImpuestoPais;
    }
  }

  salir(): void { this.dialogRef.close(); }
}
