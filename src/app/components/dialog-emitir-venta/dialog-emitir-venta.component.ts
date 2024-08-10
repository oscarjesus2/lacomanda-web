import { Component, OnInit } from '@angular/core';
import { FormControl, NgForm } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import * as moment from 'moment';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { Product } from 'src/app/models/product.models';
import { Caja } from 'src/app/models/caja.models';
import { ProductService } from 'src/app/services/product.service';
import { CajaService } from 'src/app/services/caja.service';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { DialogEmitirComprobanteComponent } from '../dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { EnumTipoDocumento } from '../../enums/enum';
import { PedidoCab } from 'src/app/models/pedido.models';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { StorageService } from 'src/app/services/storage.service';
import { Turno } from 'src/app/models/turno.models';
import { PruebaComponent } from '../prueba/prueba.component';

export interface ProductElement {
  IdProducto: number;
  Producto: string;
  Qty: number;
  Precio: number;
  Total: number;
  Moneda: string;
  CodDscto: string;
  MontoDscto: number;
  NroCupon: string;
  Tipo: number;
  ExclusivoParaAnfitriona: boolean;
  PermitirParaTragoCortesia: boolean; 
  ImpuestoBolsa: number;
}

@Component({
  selector: 'app-dialog-emitir-venta',
  templateUrl: './dialog-emitir-venta.component.html',
  styleUrls: ['./dialog-emitir-venta.component.css']
})
export class DialogEmitirVentaComponent implements OnInit {
  TipoDocumento = EnumTipoDocumento; 
  productCtrl = new FormControl();
  filteredProducts: Observable<Product[]>;
  products: Product[];
  displayedColumns: string[] = ['Producto', 'Qty', 'Precio', 'Total', 'actions'];
  dataSource = new MatTableDataSource<ProductElement>([]);

  bTurnoIndenpendiente: boolean = false;
  
  listCaja: Caja[];
  cajaSeleccionada: string = '';
  monedaSeleccionada: string = 'SOLES';
  turnoAbierto: Turno = new Turno();
  fechaTurnoAbierto: string='';
  tipoCambioVenta: string = '0';
  tipoCambioCompra: string = '0';
  visibleInfoTurno: boolean;
  observacionValue: string = '';
  fechaDocumento: Date;
  VentaEnabled: boolean = true;
  CompraEnabled: boolean = true;
  MonedaEnabled: boolean;
  CajaEnabled: boolean = true;

  sumaTotal: number = 0;
  sumaDscto: number = 0;
  sumaImporte: number = 0;
  sumaImpuestoBolsa: number = 0;
  sumaGranTotal: number = 0;

  constructor(
    public dialogRef: MatDialogRef<DialogEmitirVentaComponent>,
    public dialog: MatDialog,
    private storageService: StorageService,
    private cajaService: CajaService,
    private productoService: ProductService,
    private spinnerService: NgxSpinnerService,
  ) {}

  private async initializeCaja(): Promise<void> {
    try {
      this.listCaja = await this.cajaService.getAllCaja(1).toPromise();
      const defaultCajaId = this.listCaja.find(x => x.IdCaja === '000') ? '000' : '001';
      this.cajaSeleccionada = defaultCajaId;
      this.ValidarCaja(this.listCaja.find(x => x.IdCaja === defaultCajaId));
    } catch (error) {
      console.error('Error loading Caja', error);
      throw error;  // Rethrow to be caught by ngOnInit
    }
  }

  private async initializeProductos(): Promise<void> {
    try {
      this.products = await this.productoService.getProductosParaVenta(1).toPromise();
      this.filteredProducts = this.productCtrl.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value)),
        catchError(error => {
          console.error('Error loading products', error);
          return of([]);  // Return an empty array on error
        })
      );
    } catch (error) {
      console.error('Error loading products', error);
      throw error;  // Rethrow to be caught by ngOnInit
    }
  }
  
  async ngOnInit() {
    this.spinnerService.show();
    try {
      await this.initializeCaja();
      await this.initializeProductos();
    } catch (e) {
      Swal.fire('Algo anda mal', e.error, 'error');
      console.log(e);
    } finally {
      this.spinnerService.hide();
    }
  }

  private _filter(value: any): Product[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return this.products.filter(product => product.NombreCorto.toLowerCase().includes(filterValue));
  }

  displayProductName(product?: Product): string | undefined {
    return product ? product.NombreCorto : undefined;
  }

  ValidarCaja(oCaja: Caja): void {
    if (oCaja.IdCaja != '000') {
      if (oCaja.TurnoAbierto != null) {
        this.turnoAbierto = oCaja.TurnoAbierto;
        this.fechaTurnoAbierto = moment(new Date(this.turnoAbierto.FechaInicio)).format("DD/MM/YYYY HH:mm:ss");
        this.tipoCambioCompra = oCaja.TurnoAbierto.TipoCambio.toString();
        this.tipoCambioVenta = oCaja.TurnoAbierto.TipoCambioVenta.toString();
        this.visibleInfoTurno = true;
        this.monedaSeleccionada = 'SOLES';
        this.MonedaEnabled = false;

        this.CompraEnabled = false;
        this.VentaEnabled = false;
      } else {
        Swal.fire({
          title: 'Validación',
          text: `Debe aperturar un turno de la ${oCaja.Descripcion} para poder emitir un comprobante de venta.`,
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        this.cajaSeleccionada = '000';
        this.visibleInfoTurno = false;
        this.MonedaEnabled = true;
      }
    } else {
      this.tipoCambioCompra = "0";
      this.tipoCambioVenta = "0";

      this.CompraEnabled = true;
      this.VentaEnabled = true;
      this.visibleInfoTurno = false;
      this.MonedaEnabled = true;
    }
  }

  Factura(): void {
    this.cajaSeleccionada = '';
  }

  AgregarItemGrid(product: Product): void {
    let bSinPrecio = product.SinPrecio;
  
    if (bSinPrecio === 1) {
      this.abrirDialogoCantidad(product).then(result => {
        if (result) {
          this.actualizarPrecioProducto(product, result);
          this.agregarNuevaFila(product);
        }
      });
    } else {
      this.agregarNuevaFila(product);
    }
  }

  abrirDialogoCantidad(product: Product): Promise<any> {
    let sTitulo = product.MonedaVenta === 'SOL' ? 'Precio del Producto-SOLES' : 'Precio del Producto-DOLARES';
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      data: {
        title: sTitulo,
        quantity: '',
        hideNumber: false,
        decimalActive: true,
        minAmount: 10
      }
    });
  
    return dialogRef.afterClosed().toPromise();
  }

  actualizarPrecioProducto(product: Product, result: any): void {
    if (product.MonedaVenta === 'SOL' && this.monedaSeleccionada === 'DOLARES') {
      product.Precio = Math.round((result.value / parseFloat(this.tipoCambioCompra)) * 100) / 100;
    } else if (product.MonedaVenta === 'DOL' && this.monedaSeleccionada === 'SOLES') {
      product.Precio = Math.round((result.value * parseFloat(this.tipoCambioVenta)) * 100) / 100;
    } else {
      product.Precio = result.value;
    }
  }

  agregarNuevaFila(product: Product): void {
    let dPrecio = product.Precio;
    const newRow: ProductElement = {
      IdProducto: product.IdProducto,
      Producto: product.NombreCorto,
      Qty: 1,
      Precio: Math.round(dPrecio * 100) / 100,
      Total: Math.round(dPrecio * 100) / 100,
      CodDscto: '',
      NroCupon: '',
      MontoDscto: 0,
      ImpuestoBolsa: product.ImpuestoBolsa,
      Tipo: product.Tipo,
      ExclusivoParaAnfitriona: product.ExclusivoParaAnfitriona,
      PermitirParaTragoCortesia: product.PermitirParaTragoCortesia,
      Moneda: product.MonedaVenta
    };
  
    this.dataSource.data.push(newRow);
    this.dataSource.data = [...this.dataSource.data];
    this.productCtrl.setValue('');
    this.ValidarTipoCambios();
  }

  ValidarTipoCambios() {
    this.VentaEnabled = true;
    this.CompraEnabled = true;

    this.dataSource.data.forEach(item => {
      if (item.Moneda === 'SOL' && this.monedaSeleccionada === 'DOLARES') {
        this.CompraEnabled = false;
        this.MonedaEnabled = true;
      }
      if (item.Moneda === 'DOL' && this.monedaSeleccionada === 'SOLES') {
        this.MonedaEnabled = false;
        this.VentaEnabled = false;
      }
    });

    this.CajaEnabled = this.dataSource.data.length === 0;
  }

  onProductoSelected(event: any): void {
    const selectedProduct: Product = event.option.value;


    
    if (selectedProduct.Tipo === 1)
      {
        Swal.fire({
          title: 'Validación',
          text: `No se puede agregar una Cantidad desde esta opcion para un Producto Combo.`,
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }

      if (selectedProduct.Tipo === 2)
      {
        Swal.fire({
          title: 'Validación',
          text: `No se puede agregar una Cantidad desde esta opcion para un Producto que tiene Complementos.`,
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }

    if (selectedProduct.MonedaVenta === 'SOL' && this.monedaSeleccionada === 'DOLARES' && parseFloat(this.tipoCambioCompra) === 0) {
      Swal.fire({
        title: 'Validación',
        text: `El producto ${selectedProduct.NombreCorto} está en SOLES. Para realizar la venta en DOLARES es necesario ingresar el Tipo de Cambio COMPRA.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (selectedProduct.MonedaVenta === 'DOL' && this.monedaSeleccionada === 'SOLES' && parseFloat(this.tipoCambioVenta) === 0) {
      Swal.fire({
        title: 'Validación',
        text: `El producto ${selectedProduct.NombreCorto} está en DOLARES. Para realizar la venta en SOLES es necesario ingresar el Tipo de Cambio VENTA.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!selectedProduct.EsServicio && selectedProduct.Stock === 0) {
      Swal.fire({
        title: 'Validación',
        text: 'El producto no tiene Stock. ¿Desea continuar de todas formas?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then(result => {
        if (result.isConfirmed) {
          this.AgregarItemGrid(selectedProduct);
          this.calcularTotales();
        }
      });
    } else {
      this.AgregarItemGrid(selectedProduct);
      this.calcularTotales();
    }
  }

  calcularTotales(): void {
    let totalAux = 0;
    let desctoAux = 0;
    let impuestoBolsa = 0;

    this.dataSource.data.forEach(item => {
      totalAux += item.Total;
      desctoAux += item.MontoDscto;
      impuestoBolsa += item.ImpuestoBolsa;
    });

    this.sumaImporte = totalAux;
    this.sumaDscto = desctoAux;
    this.sumaTotal = totalAux - desctoAux;
    this.sumaImpuestoBolsa = impuestoBolsa;
    this.sumaGranTotal = this.sumaTotal + impuestoBolsa;
  }

  salir(): void {
    this.dialogRef.close();
  }

  async aumentarProductGrid(pedidoDet: ProductElement) 
  {
    pedidoDet.Qty += 1;
    this.dataSource.data.map(function(item) {
      item.Total = item.Precio * pedidoDet.Qty
      return item;
    });
    this.dataSource.data = [...this.dataSource.data];
    this.calcularTotales();
  }

  async restarProductGrid(pedidoDet: ProductElement) {
    if (pedidoDet.Qty > 1) {
      pedidoDet.Qty -= 1;
      this.dataSource.data.map(function(item) {
        item.Total = item.Precio * pedidoDet.Qty
        return item;
      });
   
    }else{
      var removeIndex = this.dataSource.data.map(function (item) { return item }).indexOf(pedidoDet);
      this.dataSource.data.splice(removeIndex, 1);
    }
    this.dataSource.data = [...this.dataSource.data];
    this.calcularTotales();
    this.ValidarTipoCambios();
  }

  addPedido(): PedidoCab {
     const pedidoCab: PedidoCab = new PedidoCab();
     const oListaPedidoDet: PedidoDet[] = [];
    pedidoCab.IdEmpleado = this.storageService.getCurrentUser().IdEmpleado;
    pedidoCab.Direccion = "";
    pedidoCab.Referencia = "";
    pedidoCab.Cliente = "";
    pedidoCab.IdPedido = 0;
    pedidoCab.NroCuenta = 1;
    pedidoCab.NroPedido = 0;
    pedidoCab.FechaCambiada = this.fechaDocumento;
    pedidoCab.Total = this.sumaTotal;
    pedidoCab.IdTipoPedido = "000";
    pedidoCab.Estado = 1;
    pedidoCab.Moneda = this.monedaSeleccionada.substring(0, 3);
    pedidoCab.TipoCambioVenta = parseFloat(this.tipoCambioVenta);
    pedidoCab.TipoCambioCompra = parseFloat(this.tipoCambioCompra);
    pedidoCab.IdMesa = "9999";
    pedidoCab.IdCaja = this.cajaSeleccionada;
    pedidoCab.NumPrecuentas = 0;
    pedidoCab.FechaPrecuenta = null;
    pedidoCab.MesaPrecuenta = null;
    pedidoCab.Observacion = this.observacionValue;
    pedidoCab.Dscto = this.sumaDscto;
    pedidoCab.Importe =  this.sumaImporte;
    pedidoCab.UsuReg = this.storageService.getCurrentSession().User.IdUsuario;
    pedidoCab.UsuMod = this.storageService.getCurrentSession().User.IdUsuario;;

    if (this.cajaSeleccionada !== "000") {
      pedidoCab.IdTurno = this.turnoAbierto.IdTurno;
      this.bTurnoIndenpendiente = false;
    } else {
      this.bTurnoIndenpendiente = true;
      pedidoCab.IdTurno = 0;
    }

    let correlativo = 1;
    this.dataSource.data.forEach(item => {
      const pedidoDet: PedidoDet = new PedidoDet();

      pedidoDet.IdPedido = 0;
      pedidoDet.NroCuenta = 1;
      pedidoDet.IdProducto = item.IdProducto;
      pedidoDet.Item = correlativo;
      pedidoDet.Precio = item.Precio;
      pedidoDet.Cantidad = item.Qty;
      pedidoDet.Subtotal = item.Total;
      pedidoDet.Enviado = true;
      if (item.CodDscto == null)
      {
          pedidoDet.IdDescuento = null;
      }
      else
      {
          pedidoDet.IdDescuento = item.CodDscto;
      }

      pedidoDet.MontoDescuento = item.MontoDscto; 
      pedidoDet.NroCupon = "VENTA";
      pedidoDet.NumEnvios = 0;
      pedidoDet.Observacion = "";
      pedidoDet.Ip = this.storageService.getCurrentIP()
      pedidoDet.MotivoReimpresion = "";
      pedidoDet.NumReimpresion = null;
      pedidoDet.UsuReimpresion = null;
      pedidoDet.FecReimpresion = null;
      pedidoDet.Estado = 2;
      pedidoDet.nombreCuenta = "";
      pedidoDet.Division = 0;
      pedidoDet.Impuesto1 = item.ImpuestoBolsa;
      correlativo++;
      oListaPedidoDet.push(pedidoDet);
    });

    pedidoCab.ListaPedidoDet = oListaPedidoDet;

    return pedidoCab;
  }
  
  OpenDialogEmitirComprobante(idTipoDoc: EnumTipoDocumento): void {
    
    if (this.dataSource.data.length <= 0) {
      Swal.fire({
        title: 'Validación',
        text: `No ha ingresado ningún producto de venta.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

 
     const dialogTurno = this.dialog.open(DialogEmitirComprobanteComponent, {
       disableClose: true,
       hasBackdrop: true,
       width: '705px', // Establece el ancho del diálogo
       height: '800px', // Establece la altura del diálogo
       data: { lblcambio: this.tipoCambioVenta, 
               dblImporte: this.sumaImporte,
               dblDscto: this.sumaDscto,
               dblTotal: this.sumaTotal,
               dblGranTotal: this.sumaGranTotal,
               idPedidoCobrar: 0,
               nroCuentaCobrar: 0, 
               idModuloVenta: 4, 
               idTipoDoc: idTipoDoc,
               pedidoCab: this.addPedido(),
               bTurnoIndenpendiente: this.bTurnoIndenpendiente,
               idCaja:this.cajaSeleccionada,
               IdTurno: this.addPedido().IdTurno
             }
     });
  }
}
