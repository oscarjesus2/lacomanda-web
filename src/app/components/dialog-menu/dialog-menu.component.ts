import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { PedidoMenu } from 'src/app/models/pedidomenu.models';
import {
  ProductoComboConfiguracion,
  ProductoComboProducto,
  ProductoComboSeccion,
} from 'src/app/models/producto-combo.models';
import { Producto } from 'src/app/models/product.models';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { ProductoComboService } from 'src/app/services/producto-combo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dialog-menu',
  templateUrl: './dialog-menu.component.html',
  styleUrls: ['./dialog-menu.component.css'],
})
export class DialogMenuComponent implements OnInit {
  readonly pedidodet: PedidoDet;
  readonly soloLectura: boolean;

  configuracion: ProductoComboConfiguracion = {
    IdProducto: 0,
    Secciones: [],
  };
  seccionSeleccionada: ProductoComboSeccion | null = null;
  selecciones: PedidoMenu[] = [];
  cantidadMenu = 1;
  cargando = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { pedidodet: PedidoDet },
    private readonly productoComboService: ProductoComboService,
    private readonly textCatalog: TenantTextCatalogService,
    private readonly dialogRef: MatDialogRef<DialogMenuComponent>,
  ) {
    this.pedidodet = data.pedidodet;
    this.soloLectura = this.pedidodet.Item > 0;
    this.cantidadMenu = Math.max(1, Number(this.pedidodet.Cantidad) || 1);
    this.selecciones = (this.pedidodet.PedidoMenu ?? []).map(
      item =>
        new PedidoMenu({
          ...item,
          ProductoSeccionMenu: item.ProductoSeccionMenu
            ? new Producto(item.ProductoSeccionMenu)
            : undefined,
        }),
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      const response = await this.productoComboService
        .obtenerConfiguracion(this.pedidodet.Producto.IdProducto)
        .toPromise();
      this.configuracion = response?.Data ?? this.configuracion;
      this.integrarSeccionesGuardadas();

      if (this.configuracion.Secciones.length === 0) {
        await this.mostrarMenuSinConfigurar();
        return;
      }

      this.seccionSeleccionada = this.configuracion.Secciones[0];
    } catch {
      this.integrarSeccionesGuardadas();
      if (this.configuracion.Secciones.length === 0) {
        await this.mostrarMenuSinConfigurar();
        return;
      }

      this.seccionSeleccionada = this.configuracion.Secciones[0];
    } finally {
      this.cargando = false;
    }
  }

  seleccionarSeccion(seccion: ProductoComboSeccion): void {
    this.seccionSeleccionada = seccion;
  }

  opcionesDisponibles(seccion: ProductoComboSeccion): ProductoComboProducto[] {
    return seccion.Productos.filter(producto => producto.Activo);
  }

  seleccionesDeSeccion(seccion: ProductoComboSeccion): PedidoMenu[] {
    return this.selecciones.filter(
      seleccion => seleccion.IdSeccionMenu === seccion.IdSeccionMenu,
    );
  }

  cantidadRequerida(seccion: ProductoComboSeccion): number {
    return seccion.Cantidad * this.cantidadMenu;
  }

  cantidadSeleccionada(seccion: ProductoComboSeccion): number {
    return this.seleccionesDeSeccion(seccion).reduce(
      (total, seleccion) => total + seleccion.Cantidad,
      0,
    );
  }

  seccionCompleta(seccion: ProductoComboSeccion): boolean {
    return (
      this.cantidadSeleccionada(seccion) ===
      this.cantidadRequerida(seccion)
    );
  }

  agregarOpcion(
    seccion: ProductoComboSeccion,
    producto: ProductoComboProducto,
  ): void {
    if (
      this.soloLectura ||
      this.cantidadSeleccionada(seccion) >= this.cantidadRequerida(seccion)
    ) {
      return;
    }

    const existente = this.selecciones.find(
      seleccion =>
        seleccion.IdSeccionMenu === seccion.IdSeccionMenu &&
        seleccion.IdProductoSeccionMenu === producto.IdProducto &&
        seleccion.ItemMenu === 0,
    );

    if (existente) {
      existente.Cantidad += 1;
      return;
    }

    this.selecciones.push(
      new PedidoMenu({
        IdPedido: this.pedidodet.IdPedido,
        ItemRef: this.pedidodet.Item,
        ItemMenu: 0,
        IdProductoSeccionMenu: producto.IdProducto,
        IdSeccionMenu: seccion.IdSeccionMenu,
        SeccionMenu: seccion.Descripcion,
        ProductoSeccionMenu: new Producto({
          IdProducto: producto.IdProducto,
          NombreCorto: producto.Nombre,
          IdClaseCombo: producto.IdSeccionMenu,
          Tipo: 1,
          Activo: producto.Activo,
        }),
        Cantidad: 1,
        Observacion: '',
        Enviado: false,
      }),
    );
  }

  aumentar(seccion: ProductoComboSeccion, seleccion: PedidoMenu): void {
    if (
      this.soloLectura ||
      seleccion.ItemMenu > 0 ||
      this.cantidadSeleccionada(seccion) >= this.cantidadRequerida(seccion)
    ) {
      return;
    }

    seleccion.Cantidad += 1;
  }

  disminuir(seleccion: PedidoMenu): void {
    if (this.soloLectura || seleccion.ItemMenu > 0) {
      return;
    }

    if (seleccion.Cantidad > 1) {
      seleccion.Cantidad -= 1;
      return;
    }

    this.quitar(seleccion);
  }

  quitar(seleccion: PedidoMenu): void {
    if (this.soloLectura || seleccion.ItemMenu > 0) {
      return;
    }

    this.selecciones = this.selecciones.filter(item => item !== seleccion);
  }

  normalizarCantidadMenu(value: number): void {
    if (this.soloLectura) {
      return;
    }

    const cantidad = Math.trunc(Number(value));
    this.cantidadMenu = Number.isFinite(cantidad) && cantidad > 0
      ? cantidad
      : 1;
  }

  nombreProducto(seleccion: PedidoMenu): string {
    return (
      seleccion.ProductoSeccionMenu?.NombreCorto ??
      this.configuracion.Secciones
        .flatMap(seccion => seccion.Productos)
        .find(
          producto =>
            producto.IdProducto === seleccion.IdProductoSeccionMenu,
        )?.Nombre ??
      `#${seleccion.IdProductoSeccionMenu}`
    );
  }

  aceptar(): void {
    if (this.soloLectura) {
      this.dialogRef.close();
      return;
    }

    const seccionIncompleta = this.configuracion.Secciones.find(
      seccion => !this.seccionCompleta(seccion),
    );
    if (seccionIncompleta) {
      void Swal.fire({
        title: this.textCatalog.get('validation'),
        text: this.textCatalog.get('sectionRequiresQuantity', {
          section: seccionIncompleta.Descripcion,
          quantity: this.cantidadRequerida(seccionIncompleta),
        }),
        icon: 'warning',
        confirmButtonText: this.textCatalog.get('accept'),
      });
      return;
    }

    this.pedidodet.Cantidad = this.cantidadMenu;
    this.pedidodet.Subtotal =
      this.pedidodet.Precio * this.pedidodet.Cantidad;
    this.pedidodet.PedidoMenu = this.selecciones.map(
      seleccion =>
        new PedidoMenu({
          ...seleccion,
          IdPedido: this.pedidodet.IdPedido,
          ItemRef: this.pedidodet.Item,
        }),
    );
    this.dialogRef.close({ pedidodet: this.pedidodet });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  trackSeccion(_: number, seccion: ProductoComboSeccion): number {
    return seccion.IdSeccionMenu;
  }

  trackProducto(_: number, producto: ProductoComboProducto): number {
    return producto.IdProducto;
  }

  trackSeleccion(_: number, seleccion: PedidoMenu): string {
    return [
      seleccion.IdSeccionMenu,
      seleccion.IdProductoSeccionMenu,
      seleccion.ItemMenu,
    ].join('-');
  }

  private integrarSeccionesGuardadas(): void {
    const secciones = this.configuracion.Secciones ?? [];
    const idsConfigurados = new Set(
      secciones.map(seccion => seccion.IdSeccionMenu),
    );

    this.selecciones.forEach(seleccion => {
      if (idsConfigurados.has(seleccion.IdSeccionMenu)) {
        return;
      }

      const guardadas = this.selecciones.filter(
        item => item.IdSeccionMenu === seleccion.IdSeccionMenu,
      );
      secciones.push({
        IdSeccionMenu: seleccion.IdSeccionMenu,
        Descripcion:
          seleccion.SeccionMenu || `#${seleccion.IdSeccionMenu}`,
        Cantidad: Math.max(
          1,
          Math.ceil(
            guardadas.reduce((total, item) => total + item.Cantidad, 0) /
              this.cantidadMenu,
          ),
        ),
        Productos: guardadas.map(item => ({
          IdProducto: item.IdProductoSeccionMenu,
          Nombre: this.nombreProducto(item),
          IdSeccionMenu: item.IdSeccionMenu,
          Activo: true,
        })),
      });
      idsConfigurados.add(seleccion.IdSeccionMenu);
    });

    this.configuracion = {
      IdProducto: this.pedidodet.Producto.IdProducto,
      Secciones: secciones,
    };
  }

  private async mostrarMenuSinConfigurar(): Promise<void> {
    await Swal.fire({
      title: this.textCatalog.get('menuNotConfigured'),
      text: this.textCatalog.get('menuNotConfiguredHint'),
      icon: 'warning',
      confirmButtonText: this.textCatalog.get('accept'),
    });
    this.dialogRef.close();
  }
}
