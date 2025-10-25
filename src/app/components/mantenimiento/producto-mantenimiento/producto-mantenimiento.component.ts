import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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

@Component({
  selector: 'app-producto-mantenimiento',
  templateUrl: './producto-mantenimiento.component.html',
  styleUrls: ['./producto-mantenimiento.component.css']
})
export class ProductoMantenimientoComponent implements OnInit, AfterViewInit {
  @ViewChild('productoForm') productoForm: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  showForm = false;
  productos: Producto[] = [];
  filtered = new MatTableDataSource<Producto>([]);
  filtro = '';

  // catálogos
  colores: Color[] = [];
  monedas: Moneda[] = [];
  familias: Familia[] = [];
  subfamilias: SubFamilia[] = [];
  grupos: Grupo[] = [];
  impuestoPais: ImpuestoPais[] = [];
  seccionMenu: SeccionMenu[] = [];

  // actual
  p: Producto = new Producto({InsumoProducto:'P'});
  areas: AreaImpresion[] = [];
  selectedAreas: number[] = [];

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
    private areaSrv: AreaImpresionService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
    this.cargarAreasImpresion();
  }
  ngAfterViewInit(): void { this.filtered.paginator = this.paginator; }

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
    this.impuestoPaisService.getImpuestoPais().subscribe(r => { if (r.Success) this.impuestoPais = r.Data; });
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

  nuevo(): void {
    this.resetForm();
     this.selectedAreas = []; 
    this.showForm = true;
  }

  onEdit(row: Producto): void {
    this.p = { ...row };
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
            this.cargarTodo(); Swal.fire('Producto eliminado', '', 'success');
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

    if (this.p.SinPrecio && (!this.p.PrecioMinimo || this.p.PrecioMinimo <= 0)) {
      Swal.fire('Validación', 'Cuando “SinPrecio” es verdadero, PrecioMinimo es obligatorio y > 0.', 'info'); return;
    }

    if (this.p.Tipo === 1) {
      if (!this.p.IdClaseCombo || this.p.IdClaseCombo <= 0) {
        Swal.fire('Validación', 'Para Tipo=1 (Menú) debe seleccionar Clase de Combo.', 'info'); return;
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

    if (this.productoForm.invalid) { this.markTouched(this.productoForm); return; }
    this.p.InsumoProducto='P';

    const payload: any = { ...this.p, AreasImpresionIds: this.selectedAreas };


    const obs = this.p.IdProducto ? this.productoService.actualizar(payload) : this.productoService.crear(payload);

    obs.subscribe({
      next: (res) => {
        if (!res.Success) { Swal.fire('Error', res.Message || 'Operación no realizada', 'error'); return; }
        this.cargarTodo(); this.showForm = false;
        Swal.fire('Ok', this.p.IdProducto ? 'Producto actualizado' : 'Producto creado', 'success');
      },
    });
  }

  cancelar(): void { this.resetForm(); this.cargarTodo(); this.showForm = false; }

  resetForm(): void {
    this.p = new Producto();
    this.p.Visible = true; this.p.Activo = true; this.p.IdImpuestoPais = 0; this.p.Tipo = 0;
    this.selectedAreas = [];
  }

  salir(): void { this.dialogRef.close(); }
}
