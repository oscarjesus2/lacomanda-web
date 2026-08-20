import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  ProductoComboConfiguracion,
  ProductoComboProducto,
  ProductoComboSeccion,
  ProductoComboSeccionCatalogo,
} from 'src/app/models/producto-combo.models';
import { ProductoComboService } from 'src/app/services/producto-combo.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-producto-combo-mantenimiento',
  templateUrl: './producto-combo-mantenimiento.component.html',
  styleUrls: ['./producto-combo-mantenimiento.component.css']
})
export class ProductoComboMantenimientoComponent implements OnInit {
  combos: ProductoComboProducto[] = [];
  secciones: ProductoComboSeccionCatalogo[] = [];
  configuracion = new Map<number, ProductoComboSeccion>();

  idProductoCombo: number | null = null;
  idSeccionMenu: number | null = null;
  cantidad = 1;
  seleccionados: number[] = [];
  filtro = '';

  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<ProductoComboMantenimientoComponent>,
    private readonly productoComboService: ProductoComboService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  get comboSeleccionado(): ProductoComboProducto | undefined {
    return this.combos.find(
      combo => combo.IdProducto === this.idProductoCombo
    );
  }

  get seccionSeleccionada(): ProductoComboSeccionCatalogo | undefined {
    return this.secciones.find(
      seccion => seccion.IdSeccionMenu === this.idSeccionMenu
    );
  }

  get productosFiltrados(): ProductoComboProducto[] {
    const productos = this.seccionSeleccionada?.Productos ?? [];
    const texto = this.filtro.trim().toLowerCase();
    if (!texto) {
      return productos;
    }

    return productos.filter(producto =>
      producto.Nombre.toLowerCase().includes(texto)
      || String(producto.IdProducto).includes(texto)
    );
  }

  get productosSeleccionados(): ProductoComboProducto[] {
    const productos = this.seccionSeleccionada?.Productos ?? [];
    return this.seleccionados
      .map(id => productos.find(producto => producto.IdProducto === id))
      .filter((producto): producto is ProductoComboProducto => !!producto);
  }

  get seccionConfigurada(): boolean {
    return this.idSeccionMenu !== null
      && this.configuracion.has(this.idSeccionMenu);
  }

  seleccionarCombo(): void {
    this.configuracion.clear();
    this.idSeccionMenu = null;
    this.cantidad = 1;
    this.seleccionados = [];
    this.filtro = '';

    if (!this.idProductoCombo) {
      return;
    }

    this.cargando = true;
    this.productoComboService
      .obtenerConfiguracion(this.idProductoCombo)
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: response => {
          if (!response.Success) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo cargar el combo.',
              'error'
            );
            return;
          }

          this.aplicarConfiguracion(response.Data);
          if (this.secciones.length > 0) {
            this.abrirSeccion(this.secciones[0]);
          }
        },
        error: () => Swal.fire(
          'Error',
          'No se pudo cargar la configuración del combo.',
          'error'
        ),
      });
  }

  abrirSeccion(seccion: ProductoComboSeccionCatalogo): void {
    this.idSeccionMenu = seccion.IdSeccionMenu;
    const configurada = this.configuracion.get(seccion.IdSeccionMenu);
    this.cantidad = configurada?.Cantidad ?? 1;
    this.seleccionados = configurada?.Productos
      .map(producto => producto.IdProducto) ?? [];
    this.filtro = '';
  }

  alternarProducto(producto: ProductoComboProducto, marcado: boolean): void {
    if (marcado) {
      if (!this.seleccionados.includes(producto.IdProducto)) {
        this.seleccionados = [
          ...this.seleccionados,
          producto.IdProducto,
        ];
      }
      return;
    }

    this.seleccionados = this.seleccionados.filter(
      id => id !== producto.IdProducto
    );
  }

  quitarProducto(idProducto: number): void {
    this.seleccionados = this.seleccionados.filter(
      id => id !== idProducto
    );
  }

  estaSeleccionado(idProducto: number): boolean {
    return this.seleccionados.includes(idProducto);
  }

  estaConfigurada(idSeccionMenu: number): boolean {
    return this.configuracion.has(idSeccionMenu);
  }

  guardar(): void {
    if (!this.idProductoCombo || !this.idSeccionMenu) {
      Swal.fire(
        'Validación',
        'Seleccione un combo y una sección.',
        'info'
      );
      return;
    }

    if (!Number.isInteger(this.cantidad) || this.cantidad <= 0) {
      Swal.fire(
        'Validación',
        'La cantidad permitida debe ser mayor que cero.',
        'info'
      );
      return;
    }

    if (this.seleccionados.length === 0) {
      Swal.fire(
        'Validación',
        'Seleccione al menos un producto para la sección.',
        'info'
      );
      return;
    }

    this.guardando = true;
    this.productoComboService
      .guardarSeccion(
        this.idProductoCombo,
        this.idSeccionMenu,
        {
          Cantidad: this.cantidad,
          IdProductos: this.seleccionados,
        }
      )
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: response => {
          if (!response.Success) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo guardar la sección.',
              'error'
            );
            return;
          }

          this.configuracion.set(
            response.Data.IdSeccionMenu,
            response.Data
          );
          const seccion = this.seccionSeleccionada;
          if (seccion) {
            this.abrirSeccion(seccion);
          }
          Notificar.exito('Configuración guardada',
            'La sección del combo se actualizó correctamente.');
        },
        error: () => Swal.fire(
          'Error',
          'No se pudo guardar la sección del combo.',
          'error'
        ),
      });
  }

  eliminarSeccion(): void {
    if (
      !this.idProductoCombo
      || !this.idSeccionMenu
      || !this.configuracion.has(this.idSeccionMenu)
    ) {
      return;
    }

    const seccion = this.seccionSeleccionada;
    Swal.fire({
      title: '¿Eliminar configuración?',
      text: `Se eliminarán las opciones de ${seccion?.Descripcion ?? 'esta sección'}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(resultado => {
      if (!resultado.isConfirmed) {
        return;
      }

      this.guardando = true;
      this.productoComboService
        .eliminarSeccion(this.idProductoCombo!, this.idSeccionMenu!)
        .pipe(finalize(() => this.guardando = false))
        .subscribe({
          next: response => {
            if (!response.Success) {
              Swal.fire(
                'Error',
                response.Message || 'No se pudo eliminar la sección.',
                'error'
              );
              return;
            }

            this.configuracion.delete(this.idSeccionMenu!);
            if (seccion) {
              this.abrirSeccion(seccion);
            }
            Notificar.exito('Configuración eliminada',
              '');
          },
          error: () => Swal.fire(
            'Error',
            'No se pudo eliminar la sección del combo.',
            'error'
          ),
        });
    });
  }

  salir(): void {
    this.dialogRef.close();
  }

  trackProducto(_: number, producto: ProductoComboProducto): number {
    return producto.IdProducto;
  }

  private cargarCatalogo(): void {
    this.cargando = true;
    this.productoComboService
      .obtenerCatalogo()
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: response => {
          if (!response.Success) {
            Swal.fire(
              'Error',
              response.Message || 'No se pudo cargar el catálogo.',
              'error'
            );
            return;
          }

          this.combos = response.Data.Combos ?? [];
          this.secciones = response.Data.Secciones ?? [];
        },
        error: () => Swal.fire(
          'Error',
          'No se pudo cargar el catálogo de combos.',
          'error'
        ),
      });
  }

  private aplicarConfiguracion(
    configuracion: ProductoComboConfiguracion
  ): void {
    this.configuracion = new Map(
      (configuracion?.Secciones ?? []).map(seccion => [
        seccion.IdSeccionMenu,
        seccion,
      ])
    );
  }
}
