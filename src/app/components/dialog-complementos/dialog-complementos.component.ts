import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { PedidoComplemento } from 'src/app/models/pedidocomplemento.models';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { Product } from 'src/app/models/product.models';
import { ProductService } from 'src/app/services/product.service';
import Swal from 'sweetalert2';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { DialogDeleteProductComponent } from '../dialog-delete-product/dialog-product-delete.component';

@Component({
  selector: 'app-dialog-complementos',
  templateUrl: './dialog-complementos.component.html',
  styleUrls: ['./dialog-complementos.component.css']
})
export class DialogComplementosComponent {
  producto: string = '';
  cantidad: number = 0;
  complemento: string = '';

  botones = Array.from({ length: 24 }, (_, i) => ({ label: `Btn ${i + 1}` }));
  totalComplementos: number = 0;
  totalQty: number = 0;

  listProducts: Product[];
  listProductosComplementos: Product[];
  pedidodet: PedidoDet;
  cantidadComplementos: number;
  total: number = 0;
  totIngreso: number = 0;
  listPedidoComplemento: PedidoComplemento[] = [];
  gridListaPedidoComplemento = new MatTableDataSource<PedidoComplemento>();
  displayedColumns: string[] = ['nombre', 'qty', 'ft', 'actions'];
  constructor(
    @Inject(MAT_DIALOG_DATA) 
    public data: any,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogComplementosComponent>,
  )
  {
    this.pedidodet = data.pedidodet;
    this.listProducts = data.listProducts;
    this.listProductosComplementos = this.listProducts.filter(x=> x.Tipo === 3 && x.Activo === 1).sort(p => p.PosicionComplemento);
    this.cantidadComplementos =  this.pedidodet.Producto.Qty;
    this.total = this.pedidodet.Cantidad * this.cantidadComplementos;
    if (data.pedidodet.PedidoComplemento.length){
      this.AgregarPedidoComplemento(data.pedidodet.PedidoComplemento);
    }
  }

  public validarCantTotal(intCant: number): number {
    let intVal = 0;

    if (this.totIngreso + intCant > this.total) {
        intVal = 1;
    }

    return intVal;
}

 

calcularTotal(): void {
  let intTot: number = 0;

  this.gridListaPedidoComplemento.data.forEach((item: PedidoComplemento) => {
    intTot += (item.Cantidad * item.ProductoComplemento.FactorComplemento);
});


  this.totIngreso = intTot;
}


  selectButton(btn: Product) {
    // Lógica para manejar la selección de botones

    if (this.validarCantTotal(btn.FactorComplemento) == 0){
      this.AgregarProducto(btn);
    }else
    {
      Swal.fire({
        title: 'Validación',
        text: 'El item seleccionado excede el límite de complementos',
        icon: 'info',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'swal-confirm-button',  // Puedes agregar clases personalizadas si quieres
        }
      });
    }

    console.log('Button selected:', btn);
  }

  openDialogCant() {
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: {
        title: 'Ingresar Cantidad',
        hideNumber: false,
        decimalActive: false
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.value) {
        this.pedidodet.Cantidad = result.value; // Asignar el valor seleccionado
        this.total = (this.pedidodet.Cantidad * this.cantidadComplementos);

      }
    });
  }
  
  public AgregarPedidoComplemento(pedidoComplemento: PedidoComplemento[]): void {
     this.listPedidoComplemento = pedidoComplemento;
     this.gridListaPedidoComplemento.data = this.listPedidoComplemento;
     this.calcularTotal();
   }

  public AgregarProducto(product: Product): void {
   var pedidoComplemento= new PedidoComplemento({
      IdPedido: this.pedidodet.IdPedido,
      ItemComple: 0,
      ItemRef: this.pedidodet.Item,
      ProductoComplemento: new Product({
        IdProducto: product.IdProducto,
        NombreCorto:product.NombreCorto,
        FactorComplemento: product.FactorComplemento
      }),
      Cantidad: 1
    }
    )
    this.listPedidoComplemento.push(pedidoComplemento);
    this.gridListaPedidoComplemento.data = this.listPedidoComplemento;
    this.calcularTotal();
  }

  
  aumentarProductGrid(pedidoComplemento: PedidoComplemento) {

    var intNewQty =  pedidoComplemento.Cantidad + 1;
    var intValActual = pedidoComplemento.Cantidad * pedidoComplemento.ProductoComplemento.FactorComplemento;
    var intValPosterior = intNewQty * pedidoComplemento.ProductoComplemento.FactorComplemento;

    if (((this.totIngreso - intValActual) + intValPosterior) > this.total)
    {
      Swal.fire({
        title: 'Validación',
        text: 'La cantidad excede el límite de complementos',
        icon: 'info',
        confirmButtonText: 'OK',
        customClass: {
          confirmButton: 'swal-confirm-button',  // Puedes agregar clases personalizadas si quieres
        }
      });
        return;
    }
    else
    {
      pedidoComplemento.Cantidad = intNewQty;
    }
    this.calcularTotal();
  }

  restarProductGrid(pedidoComplemento: PedidoComplemento) {

    if (pedidoComplemento.Cantidad > 1) {
      pedidoComplemento.Cantidad -= 1;
    }
    this.calcularTotal();
  }
  async deleteProductGrid(pedidoComplemento: PedidoComplemento) {

    var dataSet: any = {
      nombreProducto: pedidoComplemento.ProductoComplemento.NombreCorto,
      motivoAnulacion: '',
      confirmacion: false
    };

    if (pedidoComplemento.ItemRef > 0) {

      const dialogDeleetProductRef = this.dialog.open(DialogDeleteProductComponent, {
        width: '350px',
        data: dataSet,
        hasBackdrop: true
      });

      var resultDialog: any = await dialogDeleetProductRef.afterClosed().toPromise();

      // if (resultDialog.confirmacion) {

      //   var pedidoDelete: PedidoDelete = new PedidoDelete(
      //     this.storageService.getCurrentSession().User.IdUsuario,
      //     resultDialog.motivoAnulacion,
      //     oPedidoDet.IdPedido,
      //     oPedidoDet.Producto.IdProducto,
      //     oPedidoDet.Item);

      //   this.spinnerService.show();
      //   var responseService: ResponseService = await this.pedidoService.deletePedido(pedidoDelete).toPromise();
      //   var cofigoOk: number = 200;

      //   if (responseService.Codigo == cofigoOk) {
      //     var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(oPedidoDet);
      //     this.listProductGrid.splice(removeIndex, 1);
      //     this.gridListaPedidoDetProducto.data = this.listProductGrid;
      //     if (this.listProductGrid.length == 0) {
      //       this.limpiarPedido();
      //       this.MostrarOcultarPanelMesa = true;
      //       this.MostrarOcultarPanelProducto = false;
      //       this.ListaMesasTotal = await this.mesasService.getAllMesas().toPromise();
      //     }
      //   }
      //   this.spinnerService.hide();
      // }
    } else {
      // var removeIndex = this.listProductGrid.map(function (item) { return item.IdProducto; }).indexOf(oPedidoDet.IdProducto);
      var removeIndex = this.listPedidoComplemento.map(function (item) { return item }).indexOf(pedidoComplemento);
      this.listPedidoComplemento.splice(removeIndex, 1);
      this.gridListaPedidoComplemento.data = this.listPedidoComplemento;
    }
    this.calcularTotal();
  }

  aceptar() {
    // Lógica para aceptar los complementos

    if (this.total !== this.totIngreso) {
      Swal.fire({
        title: '¿Desea continuar de todas maneras?',
        text: 'Faltan ingresar más complementos.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isDismissed) {
          return; // El usuario seleccionó "No", por lo tanto no continuar.
        }
        this.pedidodet.PedidoComplemento = this.listPedidoComplemento;
        this.dialogRef.close({ pedidodet: this.pedidodet });
        // Aquí puedes continuar con el resto de la lógica si seleccionó "Sí".
      });
    }else {
      this.pedidodet.PedidoComplemento = this.listPedidoComplemento;

      this.dialogRef.close({ pedidodet: this.pedidodet });
    }
 
    
    console.log('Aceptado');
  }

  cancelar() {
    // Lógica para cancelar la operación
    this.dialogRef.close();
  }
}
