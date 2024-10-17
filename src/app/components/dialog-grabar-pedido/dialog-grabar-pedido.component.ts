import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { StorageService } from '../../services/storage.service';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { NgxSpinnerService } from 'ngx-spinner';
import { PedidoCab } from '../../models/pedido.models';
import { PedidoDet } from '../../models/pedidodet.models';
import { PedidoService } from '../../services/pedido.service';
@Component({
    selector: 'app-dialog-grabar-pedido',
    templateUrl: './dialog-grabar-pedido.component.html',
    styleUrls: ['./dialog-grabar-pedido.component.css']
})

export class DialogEnviarPedidoComponent {

    hide = true;
    public ListaProductosdisplayedColumns: string[] = ['nombrecorto', 'cantidad', 'observacion', 'delete'];
    public GridListaPedidoDetProducto = new MatTableDataSource<PedidoDet>();

    public oListaProductosEliminados: number[] = [];

    constructor(
        public dialogRef: MatDialogRef<DialogEnviarPedidoComponent>,
        private storageService: StorageService,
        private pedidoService: PedidoService,
        private spinnerService: NgxSpinnerService,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {  
            this.data.Resultado = "false";
            this.GridListaPedidoDetProducto.data=this.data.oPedido.ListaPedidoDet;
        }

    
    onNoClick(): void {
        this.data.Resultado = "false";
        this.dialogRef.close();
    }
    

    async DeleteProductoClick(oPedidoDet: PedidoDet) {
        
        var removeIndex = this.data.oPedido.ListaPedidoDet.map(function (item) { return item.Producto; }).indexOf(oPedidoDet.Producto);
        this.data.oPedido.ListaPedidoDet.splice(removeIndex, 1);
        this.oListaProductosEliminados.push(oPedidoDet.Producto.IdProducto);
        this.GridListaPedidoDetProducto.data = this.data.oPedido.ListaPedidoDet;
        this.data.oListaProductosEliminados=this.oListaProductosEliminados;
    }

   async onCancelarPedidoClick ()  {
    this.data.Resultado = "Cancelar";
    this.dialogRef.close(this.data);
   }
    async onEnviarPedidoClick() {

        if (this.data.oPedido.ListaPedidoDet.length > 0) {

            try
            {
                this.spinnerService.show();
                var responseRegisterPedido: any = await this.pedidoService.GrabarPedido(this.data.oPedido).toPromise();
                if (responseRegisterPedido) {
                    this.data.Resultado = "true";
                    Swal.fire(
                    'Good job!',
                    'Se registro el pedido correctamente.',
                    'success'
                    )
                    var responseImprimirPedido: any = await this.pedidoService.GrabarPedido(this.data.oPedido).toPromise();

                    this.dialogRef.close(this.data);
    
                }else{
                    this.data.Resultado = "false";
                    Swal.fire(
                        'Ops..!',
                        'No se pudo registrar el pedido. Vuelva intentarlo.',
                        'error'
                    )
                }
            }catch(e){
                this.data.Resultado = "false";
                console.log(e);
                Swal.fire(
                    'No se pudo registrar el pedido.',
                    e.error,
                    'error'
                )
            }finally{
                this.spinnerService.hide();
          
              }
            
            // this.limpiarPedido();
    
            // this.listMesas = await this.mesasService.getAllMesas().toPromise();
            // this.MostrarOcultarPanelMesa = true;
            // this.MostrarOcultarPanelProducto = false;
    

            
        }else{
            Swal.fire('Oops...', 'No ha ingresado ningun producto.', 'error')
        }
    } 

}

export interface DialogData {
    oPedido: PedidoCab,
    oListaProductosEliminados: number[],
    Resultado: string,
}

