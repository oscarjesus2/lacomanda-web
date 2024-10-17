import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { NgxSpinnerService } from 'ngx-spinner';
import { DividirCuentaDTO } from 'src/app/interfaces/CrearCuentaDTO.interface';
import { PedidoMesaDTO } from 'src/app/interfaces/pedidomesaDTO.interface';
import { Mesas } from 'src/app/models/mesas.models';
import { PedidoService } from 'src/app/services/pedido.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dialog-dividir-cuenta',
  templateUrl: './dialog-dividir-cuenta.component.html',
  styleUrls: ['./dialog-dividir-cuenta.component.css']
})
export class DialogDividirCuentaComponent {

  mesaSelected: Mesas;
  distinctPedidos = new MatTableDataSource<PedidoMesaDTO>();
  productosPedido:  PedidoMesaDTO[]=[];
  productosPedidoCuenta:  PedidoMesaDTO[]=[];
  productosNuevaCuenta:  PedidoMesaDTO[]=[];
  pedidoCuentaOrigen:  PedidoMesaDTO[]=[];
  selectedRowCuenta: PedidoMesaDTO;
  selectedRowOrigen: any;
  selectedRowDestino: any;
  nombreCuentaOrigen: string;
  nombreCuentaDestino: string;
  idPedido: number;
  constructor(
    public dialogRef: MatDialogRef<DialogDividirCuentaComponent>,
    @Inject(MAT_DIALOG_DATA) 
    public data: any,
    private pedidoService: PedidoService,
    private spinnerService: NgxSpinnerService,
  ) 
  {
    this.idPedido = this.data.idPedido;
    this.mesaSelected = this.data.mesaSelected;
  }
    
  displayedColumnsCuenta: string[] = ['NombreCuenta', 'NroCuenta', 'Actions'];
  displayedColumns: string[] = ['Producto', 'Cantidad'];
   mostrarPrimeraVista = true;
   mostrarSegundaVista = false;
 
   // Botón Agregar - Cambia a la vista de modificar cuentas
   onAddClick() {
     this.mostrarPrimeraVista = false;
     this.mostrarSegundaVista = true;

     this.pedidoCuentaOrigen = [...this.productosPedidoCuenta]; 
     this.productosNuevaCuenta = [];
   }
 
   EliminarCuenta(element: PedidoMesaDTO): void {
    const currentIndex = this.distinctPedidos.data.findIndex(p => p === element);
  
    if (currentIndex === 0) {
      this.mostrarAdvertencia('No es posible eliminar la primera cuenta.');
      return;
    }
  
    if (this.distinctPedidos.data.length > 2) {
      this.confirmarAccion(
        '¿Está seguro?',
        'El pedido se asignará al pedido inicial. ¿Desea continuar?',
        'question',
        () => this.eliminarCuenta(element)
      );
    }
    else if (currentIndex === 1) {
      this.confirmarAccion(
        '¿Está seguro?',
        'Si anula la segunda cuenta, la mesa volverá a su estado original. ¿Desea continuar?',
        'question',
        () => this.eliminarCuenta(element)
      );
    }
  }
  
  private mostrarAdvertencia(mensaje: string): void {
    Swal.fire({
      title: 'Aviso',
      text: mensaje,
      icon: 'warning',
      confirmButtonText: 'Aceptar'
    });
  }
  
  private confirmarAccion(titulo: string, mensaje: string, icono: 'warning' | 'question', accionConfirmada: () => void): void {
    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: icono,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        accionConfirmada();
      }
    });
  }
  
  private eliminarCuenta(element: PedidoMesaDTO): void {
    this.spinnerService.show();
    const eliminarCuentaDTO: DividirCuentaDTO = {
      IdPedido: this.idPedido,
      NroCuentaOrigen: element.NroCuenta,
      NroCuentaDestino: 0,
      NombreCuentaDestino: '',
      Items: ''
    };
  
    this.pedidoService.EliminarCuenta(eliminarCuentaDTO).subscribe({
      next: (response) => {
        if (response.Success) {
          this.ActualizarCuentas(response.Data);
          this.onCancelClick();
          this.selectLastRow();
          this.spinnerService.hide();
        }
      },
      error: (err) => {
        this.spinnerService.hide();
        Swal.fire('Error', 'Ocurrió un error al eliminar la cuenta. Intente nuevamente.', 'error');
      }
    });
  }
  
  
   // Botón Mostrar Pedido
   onShowClick() {
    if (this.selectedRowCuenta){
      this.dialogRef.close({ idPedido: this.selectedRowCuenta.IdPedido, nroCuenta: this.selectedRowCuenta.NroCuenta, nombreCuenta: this.selectedRowCuenta.NombreCuenta });
    }
    
   }
 
   // Botón Asignar Mesa
   onAssignClick() {
     console.log('Asignar Mesa');
   }
 
   // Botón Salir
   onExitClick() {
    this.dialogRef.close();
   }
 
   moverProducto(producto) {
    if (this.pedidoCuentaOrigen.length > 1){
      this.productosNuevaCuenta = [...this.productosNuevaCuenta, producto];
      this.pedidoCuentaOrigen = this.pedidoCuentaOrigen.filter(p => p !== producto);
      this.selectedRowDestino = producto; 
    }
   }
 
   removerProducto(producto) {
    this.pedidoCuentaOrigen = [...this.pedidoCuentaOrigen, producto];
    const removeIndex = this.productosNuevaCuenta.indexOf(producto);
    this.productosNuevaCuenta.splice(removeIndex, 1);
    this.productosNuevaCuenta = [...this.productosNuevaCuenta];
    this.selectedRowOrigen = producto; 
   }
 
   // Aceptar la división de cuentas
   async onAcceptClick() {
    this.spinnerService.show();
    let sItems: string = "";

    this.productosNuevaCuenta.forEach((item, index) => {
      sItems += item.Item + ","; 
    });

    if (sItems.length > 0) {
      sItems = sItems.substring(0, sItems.length - 1);
    }

    const crearCuentaDTO: DividirCuentaDTO = {
      IdPedido: this.idPedido,
      NroCuentaOrigen: this.pedidoCuentaOrigen[0].NroCuenta, 
      NroCuentaDestino: 0,
      NombreCuentaDestino: '',
      Items: sItems
    };

     this.pedidoService.CrearCuenta(crearCuentaDTO).subscribe(response => {
      if (response.Success) {
        this.ActualizarCuentas(response.Data)
        this.onCancelClick();
        this.selectLastRow();
        this.spinnerService.hide();
      }
    }, error => {
      Swal.fire('Error', 'Ocurrió un error al crear la cuenta. Intente nuevamente.', 'error');
      this.spinnerService.hide();
    });
   }
 
   ActualizarCuentas(pedidoMesaDTO: PedidoMesaDTO[]){
    this.distinctPedidos.data = pedidoMesaDTO.filter((pedido, index, self) =>
      index === self.findIndex(p => (
        p.IdPedido === pedido.IdPedido && 
        p.NroCuenta === pedido.NroCuenta && 
        p.NombreCuenta === pedido.NombreCuenta
      ))
    ).sort((a, b) => a.NroCuenta - b.NroCuenta);
    this.productosPedido =  pedidoMesaDTO;
   }

   // Cancelar la división de cuentas y volver a la vista anterior
   onCancelClick() {
     this.mostrarPrimeraVista = true;
     this.mostrarSegundaVista = false;
   }
 
   selectLastRow(): void {
    // Verifica si hay datos en la tabla
    if (this.distinctPedidos.data.length > 0) {
      this.selectedRowCuenta = this.distinctPedidos.data[this.distinctPedidos.data.length - 1]; // Seleccionamos la última fila
      this.selectCuenta(this.selectedRowCuenta);
    }
  }

  selectCuenta(row: PedidoMesaDTO) {
    this.selectedRowCuenta = row; // Asigna la fila seleccionada a la propiedad
    this.productosPedidoCuenta = this.productosPedido.filter(x => x.NroCuenta === row.NroCuenta);
    this.calcularTotales();
  }


  async ngOnInit() {

    this.spinnerService.show();

    try {
      // Primer servicio que necesita ejecutarse antes de otros
      this.pedidoService.FindPedidoByIdPedido(this.idPedido).subscribe(response => {
        this.ActualizarCuentas(response.Data)
        this.spinnerService.hide();
      });
  
    } catch (error) {
      this.spinnerService.hide();
    }
  }

  sumaTotal: number = 0;
  sumaDscto: number = 0;
  sumaImporte: number = 0;
  sumaImpuestoBolsa: number = 0;
  sumaGranTotal: number = 0;

  calcularTotales(): void {
    let totalAux = 0;
    let desctoAux = 0;
    let impuestoBolsa = 0;

    this.productosPedidoCuenta.forEach(item => {
      totalAux += item.Subtotal;
      desctoAux += item.MontoDescuento;
      impuestoBolsa += item.Impuesto1;
    });

    this.sumaTotal = parseFloat((totalAux - desctoAux).toFixed(2));
    this.sumaDscto = parseFloat(desctoAux.toFixed(2));
    this.sumaImporte = parseFloat(totalAux.toFixed(2));
    this.sumaImpuestoBolsa = parseFloat(impuestoBolsa.toFixed(2));
    this.sumaGranTotal = parseFloat((this.sumaTotal + impuestoBolsa).toFixed(2));
  }

 }