import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { NgxSpinnerService } from 'ngx-spinner';
import { DividirCuentaDTO } from 'src/app/interfaces/dividircuentaDTO.interface';
import { PedidoEspacioDTO as PedidoEspacioDTO } from 'src/app/interfaces/pedidoespacioDTO.interface';
import { Espacios } from 'src/app/models/espacios.models';
import { PedidoService } from 'src/app/services/pedido.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { CuentaLocal } from 'src/app/offline/caja-offline-api.service';
import Swal from 'sweetalert2';

type LineaDivision = Pick<PedidoEspacioDTO, 'IdPedido' | 'NroCuenta' | 'NombreCuenta' | 'NombreCorto' |
  'Item' | 'Cantidad' | 'Subtotal' | 'MontoDescuento' | 'Impuesto1'> & { referenciaLocal?: string };

export interface DivisionCajaLocal {
  cuentas: CuentaLocal[];
  simbolo: string;
  permiteDividir: boolean;
  dividir(cuenta: CuentaLocal, items: number[]): Promise<CuentaLocal[]>;
}

@Component({
  selector: 'app-dialog-dividir-cuenta',
  templateUrl: './dialog-dividir-cuenta.component.html',
  styleUrls: ['./dialog-dividir-cuenta.component.css']
})
export class DialogDividirCuentaComponent implements OnInit {

  espacioSelected: Espacios;
  monedaSimbolo: string = '';
  distinctPedidos = new MatTableDataSource<LineaDivision>();
  productosPedido: LineaDivision[] = [];
  productosPedidoCuenta: LineaDivision[] = [];
  productosNuevaCuenta: LineaDivision[] = [];
  pedidoCuentaOrigen: LineaDivision[] = [];
  selectedRowCuenta: LineaDivision;
  guardandoLocal = false;
  selectedRowOrigen: any;
  selectedRowDestino: any;
  nombreCuentaOrigen: string;
  nombreCuentaDestino: string;
  idPedido: number;
  constructor(
    public dialogRef: MatDialogRef<DialogDividirCuentaComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { idPedido: number; espacioSelected: Espacios; local?: DivisionCajaLocal },
    private pedidoService: PedidoService,
    private spinnerService: NgxSpinnerService,
    private configuracionService: ConfiguracionService,
    private monedaService: MonedaService,
  ) {
    this.idPedido = this.data.idPedido;
    this.espacioSelected = this.data.espacioSelected;
  }

  private loadMoneda(): void {
    this.configuracionService.get().subscribe({
      next: (cfg) => {
        const obs = cfg?.PaisISO2
          ? this.monedaService.getMonedaPorPais(cfg.PaisISO2)
          : this.monedaService.getMoneda();
        obs.subscribe({
          next: (resp) => { this.monedaSimbolo = resp?.Data?.[0]?.Simbolo ?? ''; },
          error: ()    => {}
        });
      },
      error: () => {}
    });
  }
    
  displayedColumnsCuenta: string[] = ['NombreCuenta', 'NroCuenta', 'Actions'];
  displayedColumns: string[] = ['Producto', 'Cantidad'];
   mostrarPrimeraVista = true;
   mostrarSegundaVista = false;
 
   // Botón Agregar - Cambia a la vista de modificar cuentas
   onAddClick() {
     if (!this.selectedRowCuenta || this.productosPedidoCuenta.length < 2 || this.data.local?.permiteDividir === false) return;
     this.mostrarPrimeraVista = false;
     this.mostrarSegundaVista = true;

     this.pedidoCuentaOrigen = [...this.productosPedidoCuenta]; 
     this.productosNuevaCuenta = [];
   }
 
   EliminarCuenta(element: LineaDivision): void {
    if (this.data.local) return;
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
  
  private eliminarCuenta(element: LineaDivision): void {
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
      this.dialogRef.close({ idPedido: this.selectedRowCuenta.IdPedido, nroCuenta: this.selectedRowCuenta.NroCuenta,
        nombreCuenta: this.selectedRowCuenta.NombreCuenta, referenciaLocal: this.selectedRowCuenta.referenciaLocal });
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
    if (!this.pedidoCuentaOrigen.length || !this.productosNuevaCuenta.length) return;
    if (this.data.local) {
      if (this.guardandoLocal || !this.data.local.permiteDividir) return;
      const cuenta = this.data.local.cuentas.find(c => c.identificador === this.selectedRowCuenta.referenciaLocal);
      if (!cuenta) return;
      this.guardandoLocal = true;
      try {
        this.cargarCuentasLocales(await this.data.local.dividir(cuenta, this.productosNuevaCuenta.map(linea => linea.Item)));
        this.onCancelClick();
      } catch (error) {
        this.mostrarAdvertencia(error instanceof Error ? error.message : 'No se pudo dividir la cuenta.');
      } finally {
        this.guardandoLocal = false;
      }
      return;
    }
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
 
   ActualizarCuentas(pedidoEspacioDTO: LineaDivision[]){
    this.distinctPedidos.data = pedidoEspacioDTO.filter((pedido, index, self) =>
      index === self.findIndex(p => (
        p.IdPedido === pedido.IdPedido && p.referenciaLocal === pedido.referenciaLocal &&
        p.NroCuenta === pedido.NroCuenta && 
        p.NombreCuenta === pedido.NombreCuenta
      ))
    ).sort((a, b) => a.NroCuenta - b.NroCuenta);
    this.productosPedido =  pedidoEspacioDTO;
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

  selectCuenta(row: LineaDivision) {
    this.selectedRowCuenta = row; // Asigna la fila seleccionada a la propiedad
    this.productosPedidoCuenta = this.productosPedido.filter(x => x.IdPedido === row.IdPedido
      && x.NroCuenta === row.NroCuenta && x.referenciaLocal === row.referenciaLocal);
    this.calcularTotales();
  }


  async ngOnInit() {
    if (this.data.local) {
      this.monedaSimbolo = this.data.local.simbolo;
      this.cargarCuentasLocales(this.data.local.cuentas);
      return;
    }
    this.loadMoneda();
    this.spinnerService.show();

    try {
      // Primer servicio que necesita ejecutarse antes de otros
      // Carga todos los ítems del pedido (todas las cuentas) usando el idEspacio
      this.pedidoService.FindPedidoByIdEspacio(this.espacioSelected.IdEspacio).subscribe(response => {
        this.ActualizarCuentas(response.Data)
        this.spinnerService.hide();
      });
  
    } catch (error) {
      this.spinnerService.hide();
    }
  }

  private cargarCuentasLocales(cuentas: CuentaLocal[]): void {
    this.data.local.cuentas = cuentas;
    const lineas = cuentas.filter(c => c.contenido.IdEspacio === this.espacioSelected.IdEspacio && c.contenido.Estado === 1)
      .flatMap(({ identificador, contenido }) => contenido.ListaPedidoDet.filter(l => l.Estado === 1).map(l => ({
        referenciaLocal: identificador, IdPedido: contenido.IdPedido, NroCuenta: contenido.NroCuenta,
        NombreCuenta: (contenido as { NombreCuenta?: string }).NombreCuenta || 'Cuenta ' + contenido.NroCuenta,
        NombreCorto: l.Producto.NombreCorto, Item: l.Item, Cantidad: l.Cantidad, Subtotal: l.Subtotal,
        MontoDescuento: l.MontoDescuento ?? 0, Impuesto1: l.Impuesto1 ?? 0,
      })));
    this.ActualizarCuentas(lineas);
    this.selectLastRow();
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
