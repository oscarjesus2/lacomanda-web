import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { StorageService } from '../../services/storage.service';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { NgxSpinnerService } from 'ngx-spinner';
import { PedidoCab } from '../../models/pedido.models';
import { PedidoDet } from '../../models/pedidodet.models';
import { MesasService } from '../../services/mesas.service';
import { PedidoService } from '../../services/pedido.service';
import { ProductGrid } from '../../models/product.grid.models';
import { Product } from 'src/app/models/product.models';

@Component({
    selector: 'app-dialog-ver-pedido',
    templateUrl: './dialog-ver-pedido.component.html',
    styleUrls: ['./dialog-ver-pedido.component.css']
})

export class DialogVerPedidoComponent {

    hide = true;
    public ListaProductosdisplayedColumns: string[] = ['nombrecorto', 'precio', 'cantidad', 'delete'];
    public GridListaPedidoDetProducto = new MatTableDataSource<PedidoDet>();

    public HoraPedido: string = '';
    public IdPedido: string ='';
    public Mozo:string='';
    public Total: string='';
    constructor(
        public dialogRef: MatDialogRef<DialogVerPedidoComponent>,
        private storageService: StorageService,
        private pedidoService: PedidoService,
        private mesasService: MesasService,
        private spinnerService: NgxSpinnerService,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {  
            this.data.Resultado = false;
            var oPedidoDet: PedidoDet;
            var ListaPedidoDet: PedidoDet[] = [];
            this.data.oPedidoMesa.forEach(data => {
              oPedidoDet = new PedidoDet(
                {
                    Item: data.Item, IdPedido : data.IdPedido,
                    Producto: new Product({IdProducto: data.IdProducto, NombreCorto: data.NombreCorto}) , Precio: data.Precio, Cantidad: data.Cantidad, 
                    Subtotal : data.Cantidad * data.Precio, Observacion:  data.observacion, Ip : ''
                }
              );
              ListaPedidoDet.push(oPedidoDet);
            });

            var firstItem = data.oPedidoMesa[0];
            this.Mozo = firstItem.Mozo;
            this.IdPedido = firstItem.IdPedido;
            this.HoraPedido = firstItem.HoraPedido;
            this.Total= firstItem.Total;
            this.GridListaPedidoDetProducto.data= ListaPedidoDet;
        }

    
    onNoClick(): void {
        this.data.Resultado = false;
        this.dialogRef.close(this.data);
    }
    
    deleteProductGrid(productGrid: ProductGrid){

    }
    async onImprimirPrecuentaClick() {
        try {
            this.spinnerService.show();
        
            var listData: any[] = await this.mesasService.ImprimirPrecuenta(this.data.IdMesa).toPromise();
            this.data.Resultado = true;
            this.dialogRef.close(this.data);
        }catch(e){
            console.log(e);

            Swal.fire(
            'Algo anda mal',
            e.error,
            'error'
            );
         console.log(e);
        }finally{
            this.spinnerService.hide();
    
        }
    }
      
}

export interface DialogData {
    oPedidoMesa: any,
    IdMesa: string,
    Mesa: string,
    Resultado: boolean,
}

