import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import * as moment from 'moment';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';
import { Product } from 'src/app/models/product.models';
import { Caja } from 'src/app/models/caja.models';
import { ProductService } from 'src/app/services/product.services';
import { CajaService } from 'src/app/services/caja.services';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { FormControl } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';

export interface ProductElement {
  IdProducto: number;
  Producto: string;
  Qty: number;
  Precio: number;
  Total: number;
  moneda: string;
  MontoDscto: number;
  ImpuestoBolsa: number;
}

@Component({
  selector: 'app-dialog-emitir-comprobante',
  templateUrl: './dialog-emitir-comprobante.component.html',
  styleUrls: ['./dialog-emitir-comprobante.component.css']
})
export class DialogEmitirComprobanteComponent {
  productCtrl = new FormControl();
  filteredProducts: Observable<Product[]>;
  products: Product[];
  displayedColumns: string[] = ['Producto', 'Qty', 'Precio', 'Total', 'actions'];
  dataSource = new MatTableDataSource<ProductElement>([]);

  listCaja: Caja[];
  cajaSeleccionada: string = '000'; // Valor por defecto 
  monedaSeleccionada: string = 'SOLES';
  nroTurnoAbierto: number;
  fechaTurnoAbierto: string;
  tipoCambioVenta: number;
  tipoCambioCompra: number;
  visibleInfoTurno: boolean;

  VentaEnabled: boolean;
  CompraEnabled: boolean;
  MonedaEnabled: boolean;
  CajaEnabled: boolean = true;

  sumatotal: number = 0;
  sumaDscto: number = 0;
  sumaImporte: number = 0;
  sumaImpuestoBolsa: number = 0;
  sumaGranTotal: number = 0;
  
  constructor(
    public dialogRef: MatDialogRef<DialogEmitirComprobanteComponent>,
    public dialog: MatDialog,
    private cajaService: CajaService,
    private productoService: ProductService,
    private spinnerService: NgxSpinnerService,
  ) { }

  async ngOnInit() {
    this.spinnerService.show();

    try {
      var incluyeGeneral: number;
      incluyeGeneral = 1;
      await this.cajaService.getAllCaja(incluyeGeneral).subscribe(Caja => {
        this.listCaja = Caja;
        this.ValidarTurnoAbierto(this.listCaja.find(x => x.IdCaja == '000'));
      });

      await this.productoService.getProductosParaVenta(1).subscribe(producto => {
        this.products = producto;
        this.filteredProducts = this.productCtrl.valueChanges
          .pipe(
            startWith(''),
            map(value => this._filter(value))
          );
      });

    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      );
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

  async ValidarTurnoAbierto(oCaja: Caja) {
    if (oCaja.IdCaja != '000') {
      if (oCaja.TurnoAbierto != null) {
        this.nroTurnoAbierto = oCaja.TurnoAbierto.NroTurno;
        this.fechaTurnoAbierto = moment(new Date(oCaja.TurnoAbierto.FechaInicio)).format("DD/MM/YYYY HH:mm:ss");
        this.tipoCambioCompra = oCaja.TurnoAbierto.TipoCambio;
        this.monedaSeleccionada = 'SOLES';
        this.visibleInfoTurno = true;
        this.MonedaEnabled = false;
      } else {
        this.visibleInfoTurno = false;
        this.MonedaEnabled = true;
        this.CajaEnabled = true;
        this.cajaSeleccionada='000';
        Swal.fire({
          title: 'Validación',
          text: 'Debe aperturar un turno de la ' + oCaja.Descripcion + ' para poder emitir un comprobante de venta.',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
      }
    }else{
      this.visibleInfoTurno= false;
      this.CajaEnabled = true;
    }

  }

  AgregarItemGrid(product: Product): void {
    console.log('AgregarItemGrid');
    let sTitulo = '';
    let dPrecio = product.Precio;
    let bSinPrecio = product.SinPrecio;

    if (bSinPrecio === 1) {
      if (product.MonedaVenta === 'SOL') {
        sTitulo = 'Precio del Producto-SOLES';
      } else if (product.MonedaVenta === 'DOL') {
        sTitulo = 'Precio del Producto-DOLARES';
      }

      const dialogRef = this.dialog.open(DialogMCantComponent, {
        data: {
          title: sTitulo,
          quantity: '',
          hideNumber: false,
          decimalActive: true,
          minAmount: 10
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.value) {
          // Aquí manejas el resultado del diálogo
          console.log('Valor ingresado:', result.value);


          if (product.MonedaVenta === 'SOL' && this.monedaSeleccionada === 'DOLARES') {
            product.Precio = Math.round((result.value / this.tipoCambioCompra) * 100) / 100;

          }else if (product.MonedaVenta === 'DOL' && this.monedaSeleccionada === 'SOLES') {
            product.Precio  = Math.round((result.value * this.tipoCambioVenta) * 100) / 100;
          }else{
            product.Precio  = result.value;
          }
        }
      });
    }

    // Ejemplo de lógica para actualizar el dataSource y otros datos según tu aplicación
    const newRow: ProductElement = {
      IdProducto: product.IdProducto,
      Producto: product.NombreCorto,
      Qty: 1,
      Precio: Math.round(dPrecio * 100) / 100,
      Total: Math.round(dPrecio * 100) / 100 * 1,
      moneda: product.MonedaVenta,
      MontoDscto:0,
      ImpuestoBolsa: product.ImpuestoBolsa
    };

    this.dataSource.data.push(newRow);
    this.dataSource.data = [...this.dataSource.data];

    this.ValidarTipoCambios(); // Llama a tu método de validación de tipos de cambio
    
  }

  ValidarTipoCambios() {
    this.VentaEnabled = true;
    this.CompraEnabled = true;
    this.MonedaEnabled = true;

    this.dataSource.data.forEach(item => {
      if (item.moneda === 'SOL' && this.monedaSeleccionada === 'DOLARES') {
        this.CompraEnabled = false;
        this.MonedaEnabled = true;
      }
      if (item.moneda === 'DOL' && this.monedaSeleccionada === 'SOLES') {
        this.MonedaEnabled = false;
        this.VentaEnabled = false;
      }
    });

    if (this.dataSource.data.length === 0) {
      this.CajaEnabled = true;
    } else {
      this.CajaEnabled = false;
    }
  }

  onProductoSelected(event: any): void {
    const selectedProduct: Product = event.option.value;

    // Lógica para verificar la moneda de venta y mostrar advertencias según las condiciones
    if (selectedProduct.MonedaVenta === 'SOL' && this.monedaSeleccionada === 'DOLARES' && this.tipoCambioCompra === 0) {
      Swal.fire({
        title: 'Validación',
        text: `El producto ${selectedProduct.NombreCorto} está en SOLES. Para realizar la venta en DOLARES es necesario ingresar el Tipo de Cambio COMPRA.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    if (selectedProduct.MonedaVenta === 'DOL' && this.monedaSeleccionada === 'SOLES' && this.tipoCambioVenta === 0) {
      Swal.fire({
        title: 'Validación',
        text: `El producto ${selectedProduct.NombreCorto} está en DOLARES. Para realizar la venta en SOLES es necesario ingresar el Tipo de Cambio VENTA.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Lógica para verificar si el producto es un servicio y no tiene stock
    if (!selectedProduct.EsServicio && selectedProduct.Stock === 0) {
      Swal.fire({
        title: 'Validación',
        text: 'El producto no tiene Stock. ¿Desea continuar de todas formas?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isConfirmed) {
          this.AgregarItemGrid(selectedProduct);
          this.calcularTotales();
        }
      });
    }
  }

  calcularTotales(): void {
    let totalAux = 0;
    let desctoAux = 0;
    let impuestoBolsa = 0;
    console.info("Calcular totales");
    this.dataSource.data.forEach(item => {
      totalAux += item.Total;
      desctoAux += item.MontoDscto;
      impuestoBolsa += item.ImpuestoBolsa;
    });

    this.sumatotal = this.formatNumber(totalAux - desctoAux);
    this.sumaDscto = this.formatNumber(desctoAux);
    this.sumaImporte = this.formatNumber(totalAux);
    this.sumaImpuestoBolsa = this.formatNumber(impuestoBolsa);
    this.sumaGranTotal = this.formatNumber(totalAux + impuestoBolsa - desctoAux);
  }

  // Función para formatear números a 2 decimales
  formatNumber(value: number): number {
    return parseFloat(value.toFixed(2));
  }
  public salir(): void 
  {
    this.dialogRef.close();
  }

  async aumentarProductGrid(oPedidoDet: ProductElement) 
  {
    oPedidoDet.Qty += 1;
    this.dataSource.data.map(function(item) {
      item.Total = item.Precio * oPedidoDet.Qty
      return item;
    });
    this.dataSource.data = [...this.dataSource.data];
    this.calcularTotales();
  }

  async restarProductGrid(oPedidoDet: ProductElement) {
    if (oPedidoDet.Qty > 1) {
      oPedidoDet.Qty -= 1;
      this.dataSource.data.map(function(item) {
        item.Total = item.Precio * oPedidoDet.Qty
        return item;
      });
   
    }else{
      var removeIndex = this.dataSource.data.map(function (item) { return item }).indexOf(oPedidoDet);
      this.dataSource.data.splice(removeIndex, 1);
    }
    this.dataSource.data = [...this.dataSource.data];
    this.calcularTotales();
    this.ValidarTipoCambios();
  }
}
