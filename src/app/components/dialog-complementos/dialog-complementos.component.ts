import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { lastValueFrom } from 'rxjs';
import { PedidoComplemento } from 'src/app/models/pedidocomplemento.models';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { Producto } from 'src/app/models/product.models';
import Swal from 'sweetalert2';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { DialogDeleteProductComponent } from '../dialog-delete-product/dialog-product-delete.component';

@Component({
  selector: 'app-dialog-complementos',
  templateUrl: './dialog-complementos.component.html',
  styleUrls: ['./dialog-complementos.component.css']
})
export class DialogComplementosComponent {

  listProductosComplementos: Producto[];
  pedidodet: PedidoDet;
  cantidadComplementos: number;
  total: number = 0;
  totIngreso: number = 0;
  listPedidoComplemento: PedidoComplemento[] = [];
  gridListaPedidoComplemento = new MatTableDataSource<PedidoComplemento>();
  displayedColumns: string[] = ['nombre', 'qty', 'ft', 'actions'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogComplementosComponent>,
  ) {
    this.pedidodet              = data.pedidodet;
    const listProducts: Producto[] = data.listProducts;
    this.listProductosComplementos = listProducts
      .filter(x => x.Tipo === 3 && x.Activo === true)
      .sort(p => p.PosicionComplemento);

    this.cantidadComplementos = this.pedidodet.Producto.Qty;
    this.total = this.pedidodet.Cantidad * this.cantidadComplementos;

    if (data.pedidodet.PedidoComplemento.length) {
      this.agregarPedidoComplemento(data.pedidodet.PedidoComplemento);
    }
  }

  // ── Validación ─────────────────────────────────────────────

  private validarCantTotal(factor: number): boolean {
    return (this.totIngreso + factor) <= this.total;
  }

  private calcularTotal(): void {
    this.totIngreso = this.gridListaPedidoComplemento.data
      .reduce((sum, item) => sum + item.Cantidad * item.ProductoComplemento.FactorComplemento, 0);
  }

  // ── Selección de complemento ────────────────────────────────

  selectButton(btn: Producto): void {
    if (this.validarCantTotal(btn.FactorComplemento)) {
      this.agregarProducto(btn);
    } else {
      Swal.fire({
        title: 'Validación',
        text: 'El item seleccionado excede el límite de complementos',
        icon: 'info',
        confirmButtonText: 'OK',
      });
    }
  }

  openDialogCant(): void {
    const ref = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: { title: 'Ingresar Cantidad', hideNumber: false, decimalActive: false }
    });
    ref.afterClosed().subscribe(result => {
      if (result?.value) {
        this.pedidodet.Cantidad = result.value;
        this.total = this.pedidodet.Cantidad * this.cantidadComplementos;
      }
    });
  }

  // ── CRUD complementos ────────────────────────────────────────

  agregarPedidoComplemento(pedidoComplemento: PedidoComplemento[]): void {
    this.listPedidoComplemento = pedidoComplemento;
    this.gridListaPedidoComplemento.data = this.listPedidoComplemento;
    this.calcularTotal();
  }

  agregarProducto(product: Producto): void {
    const item = new PedidoComplemento({
      IdPedido: this.pedidodet.IdPedido,
      ItemComple: 0,
      ItemRef: this.pedidodet.Item,
      ProductoComplemento: new Producto({
        IdProducto: product.IdProducto,
        NombreCorto: product.NombreCorto,
        FactorComplemento: product.FactorComplemento,
      }),
      Cantidad: 1,
    });
    this.listPedidoComplemento.push(item);
    this.gridListaPedidoComplemento.data = this.listPedidoComplemento;
    this.calcularTotal();
  }

  aumentarProductGrid(pedidoComplemento: PedidoComplemento): void {
    const newQty      = pedidoComplemento.Cantidad + 1;
    const valActual   = pedidoComplemento.Cantidad * pedidoComplemento.ProductoComplemento.FactorComplemento;
    const valPosterior = newQty * pedidoComplemento.ProductoComplemento.FactorComplemento;

    if ((this.totIngreso - valActual + valPosterior) > this.total) {
      Swal.fire({
        title: 'Validación',
        text: 'La cantidad excede el límite de complementos',
        icon: 'info',
        confirmButtonText: 'OK',
      });
      return;
    }
    pedidoComplemento.Cantidad = newQty;
    this.calcularTotal();
  }

  restarProductGrid(pedidoComplemento: PedidoComplemento): void {
    if (pedidoComplemento.Cantidad > 1) {
      pedidoComplemento.Cantidad -= 1;
      this.calcularTotal();
    }
  }

  async deleteProductGrid(pedidoComplemento: PedidoComplemento): Promise<void> {
    if (pedidoComplemento.ItemComple > 0) {
      const dataSet = {
        nombreProducto: pedidoComplemento.ProductoComplemento.NombreCorto,
        motivoAnulacion: '',
        confirmacion: false,
      };
      const dialogRef = this.dialog.open(DialogDeleteProductComponent, {
        width: '350px',
        data: dataSet,
        hasBackdrop: true,
      });
      await lastValueFrom(dialogRef.afterClosed());
      // La lógica de anulación remota se implementará cuando el endpoint esté disponible
    } else {
      const idx = this.listPedidoComplemento.indexOf(pedidoComplemento);
      if (idx > -1) {
        this.listPedidoComplemento.splice(idx, 1);
        this.gridListaPedidoComplemento.data = [...this.listPedidoComplemento];
      }
    }
    this.calcularTotal();
  }

  // ── Aceptar / Cancelar ───────────────────────────────────────

  aceptar(): void {
    if (this.totIngreso === this.total) {
      this.cerrarConDatos();
      return;
    }

    if (this.totIngreso > this.total) {
      Swal.fire({
        title: 'Límite superado',
        text: 'Los complementos ingresados superan el límite. Elimine los excedentes antes de continuar.',
        icon: 'error',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    // totIngreso < total: permite continuar con advertencia
    Swal.fire({
      title: '¿Desea continuar de todas maneras?',
      text: 'Aún faltan complementos por ingresar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
    }).then(result => {
      if (result.isConfirmed) {
        this.cerrarConDatos();
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  private cerrarConDatos(): void {
    this.pedidodet.PedidoComplemento = this.listPedidoComplemento;
    this.dialogRef.close({ pedidodet: this.pedidodet });
  }
}
