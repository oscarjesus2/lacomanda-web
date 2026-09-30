import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, NgForm } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { Producto } from 'src/app/models/product.models';
import { CajaDto } from 'src/app/models/caja.models';
import { CajaService } from 'src/app/services/caja.service';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { DialogEmitirComprobanteComponent } from '../dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { CanalVentaEnum, EnumTipoDocumento } from '../../enums/enum';
import { PedidoCab } from 'src/app/models/pedido.models';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { StorageService } from 'src/app/services/storage.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { validarBorradorVentaDirecta } from './venta-directa.validator';
import { VentaDirectaService } from 'src/app/services/venta-directa.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import {
  VentaDirectaProducto,
  VentaDirectaProductoImpuesto,
} from 'src/app/models/venta-directa.models';

export interface ProductElement {
  IdProducto: number;
  Producto: string;
  Qty: number;
  Precio: number;
  PrecioMinimo: number;
  Total: number;
  Moneda: string;
  CodDscto: string;
  MontoDscto: number;
  NroCupon: string;
  Tipo: number;
  ExclusivoParaAnfitriona: boolean;
  PermitirParaTragoCortesia: boolean;
  Impuestos: VentaDirectaProductoImpuesto[];
}

@Component({
  selector: 'app-dialog-emitir-venta',
  templateUrl: './dialog-emitir-venta.component.html',
  styleUrls: ['./dialog-emitir-venta.component.css']
})
export class DialogEmitirVentaComponent implements OnInit {
  @ViewChild('form') form: NgForm;
  TipoDocumento = EnumTipoDocumento; 
  productCtrl = new FormControl();
  filteredProducts: Observable<VentaDirectaProducto[]>;
  products: VentaDirectaProducto[] = [];
  displayedColumns: string[] = ['Producto', 'Qty', 'Precio', 'Total', 'actions'];
  dataSource = new MatTableDataSource<ProductElement>([]);

  listCaja: CajaDto[] = [];
  cajaSeleccionada: number = 0;
  monedaSeleccionada: string = 'PEN';
  simboloMoneda: string = 'S/';
  tipoCambioVenta: string = '0';
  tipoCambioCompra: string = '0';
  observacionValue: string = '';
  fechaDocumento: Date = new Date();

  sumaTotal: number = 0;
  sumaDscto: number = 0;
  sumaImporte: number = 0;
  sumaSubtotal: number = 0;
  sumaImpuestos: number = 0;
  sumaGranTotal: number = 0;

  constructor(
    public dialogRef: MatDialogRef<DialogEmitirVentaComponent>,
    public dialog: MatDialog,
    private storageService: StorageService,
    private cajaService: CajaService,
    private ventaDirectaService: VentaDirectaService,
    private configuracionService: ConfiguracionService,
    private spinnerService: NgxSpinnerService,
    private texts: TenantTextCatalogService,
  ) {}

  private async initializeCaja(): Promise<void> {
    const response = await firstValueFrom(this.cajaService.getAllCaja(true));
    this.listCaja = (response.Data ?? []).filter(item =>
      item.Activo && !!item.TurnoAbierto?.IdTurno);
    const caja = this.listCaja.find(item =>
      item.CajaPorDefecto)
      ?? this.listCaja[0];
    if (!caja) {
      throw new Error('No existe una caja activa con turno abierto.');
    }

    this.onCajaSeleccionada(caja.IdCaja);
  }

  private async initializeProductos(): Promise<void> {
    const response = await firstValueFrom(
      this.ventaDirectaService.listarProductos(),
    );
    this.products = response.Data ?? [];
    this.filteredProducts = this.productCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
      catchError(() => of([])),
    );
  }
  
  async ngOnInit() {
    this.spinnerService.show();
    try {
      await Promise.all([
        this.initializeMoneda(),
        this.initializeCaja(),
        this.initializeProductos(),
      ]);
    } catch (e) {
      const message = e instanceof Error
        ? e.message
        : (e as any)?.error?.Message || (e as any)?.error || this.texts.get('unexpectedError');
      Swal.fire(this.texts.get('unexpectedError'), message, 'error');
      console.log(e);
    } finally {
      this.spinnerService.hide();
    }
  }

  private async initializeMoneda(): Promise<void> {
    const configuracion = this.configuracionService.snapshot
      ?? await firstValueFrom(this.configuracionService.get());
    this.monedaSeleccionada = this.normalizarCodigoMoneda(
      configuracion.CodigoISO4217 || configuracion.IdMoneda,
    );
    this.simboloMoneda = configuracion.SimboloMoneda
      || this.simboloPorCodigo(this.monedaSeleccionada);
  }

  private _filter(value: any): VentaDirectaProducto[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return this.products.filter(product => product.NombreCorto.toLowerCase().includes(filterValue));
  }

  displayProductName(product?: VentaDirectaProducto): string | undefined {
    return product ? product.NombreCorto : undefined;
  }

  AgregarItemGrid(product: VentaDirectaProducto): void {
    if (product.SinPrecio) {
      this.abrirDialogoCantidad(product).then(result => {
        if (result) {
          this.actualizarPrecioProducto(product, result);
          this.agregarNuevaFila(product);
          this.calcularTotales();
        }
      });
    } else {
      this.agregarNuevaFila(product);
      this.calcularTotales();
    }
  }

  abrirDialogoCantidad(product: VentaDirectaProducto): Promise<any> {
    const codigoMoneda = this.normalizarCodigoMoneda(
      product.IdMoneda || this.monedaSeleccionada,
    );
    const simbolo = codigoMoneda === this.monedaSeleccionada
      ? this.simboloMoneda
      : this.simboloPorCodigo(codigoMoneda);
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      data: {
        title: `Precio del producto · ${simbolo} ${codigoMoneda}`,
        quantity: '',
        hideNumber: false,
        decimalActive: true,
        minAmount: product.PrecioMinimo || 0,
      }
    });
  
    return dialogRef.afterClosed().toPromise();
  }

  actualizarPrecioProducto(product: VentaDirectaProducto, result: any): void {
    const monedaProducto = this.normalizarCodigoMoneda(product.IdMoneda);
    if (monedaProducto === 'PEN' && this.monedaSeleccionada === 'USD') {
      product.Precio = Math.round((result.value / parseFloat(this.tipoCambioCompra)) * 100) / 100;
    } else if (monedaProducto === 'USD' && this.monedaSeleccionada === 'PEN') {
      product.Precio = Math.round((result.value * parseFloat(this.tipoCambioVenta)) * 100) / 100;
    } else {
      product.Precio = parseFloat(result.value);
    }
  }

  agregarNuevaFila(product: VentaDirectaProducto): void {
    const dPrecio = product.Precio;
    const newRow: ProductElement = {
      IdProducto: product.IdProducto,
      Producto: product.NombreCorto,
      Qty: 1,
      Precio: Math.round(dPrecio * 100) / 100,
      PrecioMinimo: this.precioMinimoEnMonedaVenta(product),
      Total: Math.round(dPrecio * 100) / 100,
      CodDscto: '',
      NroCupon: '',
      MontoDscto: 0,
      Tipo: product.Tipo,
      ExclusivoParaAnfitriona: product.ExclusivoParaAnfitriona,
      PermitirParaTragoCortesia: product.PermitirParaTragoCortesia,
      Moneda: this.normalizarCodigoMoneda(product.IdMoneda),
      Impuestos: product.Impuestos ?? [],
    };
  
    this.dataSource.data.push(newRow);
    this.dataSource.data = [...this.dataSource.data];
    this.productCtrl.setValue('');
  }

  onCajaSeleccionada(idCaja: number): void {
    this.cajaSeleccionada = idCaja;
    const caja = this.listCaja.find(item => item.IdCaja === idCaja);
    this.tipoCambioCompra = caja?.TurnoAbierto?.TipoCambio?.toString() ?? '1';
    this.tipoCambioVenta = caja?.TurnoAbierto?.TipoCambioVenta?.toString() ?? '1';
  }

  onProductoSelected(event: any): void {
    const selectedProduct: VentaDirectaProducto = event.option.value;

    if (selectedProduct.Tipo === 1) {
      Swal.fire({
        title: this.texts.get('validation'),
        text: this.texts.get('cannotAddQtyCombo'),
        icon: 'warning',
        confirmButtonText: this.texts.get('ok')
      });
      return;
    }

    if (selectedProduct.Tipo === 2) {
      Swal.fire({
        title: this.texts.get('validation'),
        text: this.texts.get('cannotAddQtyComplements'),
        icon: 'warning',
        confirmButtonText: this.texts.get('ok')
      });
      return;
    }

    const monedaProducto = this.normalizarCodigoMoneda(selectedProduct.IdMoneda);
    if (monedaProducto === 'PEN'
        && this.monedaSeleccionada === 'USD'
        && parseFloat(this.tipoCambioCompra) === 0) {
      Swal.fire({
        title: this.texts.get('validation'),
        text: this.texts.get('productInSolesNeedBuyRate', { product: selectedProduct.NombreCorto }),
        icon: 'warning',
        confirmButtonText: this.texts.get('ok')
      });
      return;
    }

    if (monedaProducto === 'USD'
        && this.monedaSeleccionada === 'PEN'
        && parseFloat(this.tipoCambioVenta) === 0) {
      Swal.fire({
        title: this.texts.get('validation'),
        text: this.texts.get('productInDollarsNeedSellRate', { product: selectedProduct.NombreCorto }),
        icon: 'warning',
        confirmButtonText: this.texts.get('ok')
      });
      return;
    }

    this.AgregarItemGrid(selectedProduct);
  }

  calcularTotales(): void {
    let totalAux = 0;
    let desctoAux = 0;
    let impuestosAux = 0;

    this.dataSource.data.forEach(item => {
      totalAux += item.Total;
      desctoAux += item.MontoDscto;
      impuestosAux += this.calcularImpuestosLinea(item);
    });

    this.sumaImporte = this.redondear(totalAux);
    this.sumaDscto = this.redondear(desctoAux);
    this.sumaTotal = this.redondear(totalAux - desctoAux);
    this.sumaImpuestos = this.redondear(impuestosAux);
    this.sumaSubtotal = this.redondear(this.sumaTotal - this.sumaImpuestos);
    this.sumaGranTotal = this.sumaTotal;
  }

  salir(): void {
    this.dialogRef.close();
  }

  aumentarProductGrid(pedidoDet: ProductElement): void {
    pedidoDet.Qty += 1;
    pedidoDet.Total = pedidoDet.Precio * pedidoDet.Qty;
    this.dataSource.data = [...this.dataSource.data];
    this.calcularTotales();
  }

  restarProductGrid(pedidoDet: ProductElement): void {
    if (pedidoDet.Qty > 1) {
      pedidoDet.Qty -= 1;
      pedidoDet.Total = pedidoDet.Precio * pedidoDet.Qty;
    }
    this.dataSource.data = [...this.dataSource.data];
    this.calcularTotales();
  }

  eliminarProductGrid(pedidoDet: ProductElement): void {
    this.dataSource.data = this.dataSource.data.filter(item => item !== pedidoDet);
    this.calcularTotales();
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
    pedidoCab.IdCanalVenta = CanalVentaEnum.VENTA_DIRECTA;
    pedidoCab.Estado = 1;
    pedidoCab.Moneda = this.monedaSeleccionada;
    pedidoCab.TipoCambioVenta = parseFloat(this.tipoCambioVenta);
    pedidoCab.TipoCambioCompra = parseFloat(this.tipoCambioCompra);
    pedidoCab.IdEspacio = 0;
    pedidoCab.IdCaja = this.cajaSeleccionada;
    pedidoCab.NumPrecuentas = 0;
    pedidoCab.FechaPrecuenta = null;
    pedidoCab.EspacioPrecuenta = null;
    pedidoCab.Observacion = this.observacionValue;
    pedidoCab.Dscto = this.sumaDscto;
    pedidoCab.Importe =  this.sumaImporte;
    pedidoCab.UsuReg = this.storageService.getCurrentSession().User.IdUsuario;
    pedidoCab.UsuMod = this.storageService.getCurrentSession().User.IdUsuario;;

    pedidoCab.IdTurno = this.cajaActual?.TurnoAbierto?.IdTurno ?? 0;

    let correlativo = 1;
    this.dataSource.data.forEach(item => {
      const pedidoDet: PedidoDet = new PedidoDet();

      pedidoDet.IdPedido = 0;
      pedidoDet.NroCuenta = 1;
      pedidoDet.Producto = new Producto({IdProducto: item.IdProducto})
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
      pedidoDet.NroCupon = "";
      pedidoDet.NumEnvios = 0;
      pedidoDet.Observacion = "";
      pedidoDet.Ip = this.storageService.getCurrentIP()
      pedidoDet.MotivoReimpresion = "";
      pedidoDet.NumReimpresion = null;
      pedidoDet.UsuReimpresion = null;
      pedidoDet.FecReimpresion = null;
      pedidoDet.Estado = 2;
      pedidoDet.NombreCuenta = "";
      pedidoDet.Division = 0;
      correlativo++;
      oListaPedidoDet.push(pedidoDet);
    });

    pedidoCab.ListaPedidoDet = oListaPedidoDet;

    return pedidoCab;
  }
  
  private markFormControlsAsTouchedAndDirty(form: NgForm) {
    Object.keys(form.controls).forEach(field => {
      const control = form.controls[field];
      control.markAsTouched({ onlySelf: true });
      control.markAsDirty({ onlySelf: true });
    });
  } 

  OpenDialogEmitirComprobante(idTipoDoc: EnumTipoDocumento): void {
    
    this.markFormControlsAsTouchedAndDirty(this.form);

    // Aquí puedes continuar con la lógica que tenías para emitir el comprobante
    if (this.form.valid) {
      if (!this.cajaActual?.TurnoAbierto?.IdTurno) {
        Swal.fire(
          this.texts.get('validation'),
          'La caja seleccionada no tiene un turno abierto. Abre el turno antes de registrar la venta.',
          'warning',
        );
        return;
      }
      const error = validarBorradorVentaDirecta({
        fechaDocumento: this.fechaDocumento,
        detalles: this.dataSource.data,
      });
      if (error) {
        Swal.fire({
          title: this.texts.get('validation'),
          text: error,
          icon: 'warning',
          confirmButtonText: this.texts.get('ok')
        });
        return;
      }
  
   
       const dialogTurno = this.dialog.open(DialogEmitirComprobanteComponent, {
         disableClose: true,
         hasBackdrop: true,
         width: '900px',
         maxWidth: '95vw',
         data: { lblcambio: this.tipoCambioVenta, 
                 dblImporte: this.sumaImporte,
                 dblDscto: this.sumaDscto,
                 dblTotal: this.sumaTotal,
                 dblGranTotal: this.sumaGranTotal,
                 idPedidoCobrar: 0,
                 nroCuentaCobrar: 0, 
                 idTipoPedido: '004', 
                 idTipoDoc: idTipoDoc,
                 pedidoCab: this.addPedido(),
                 // Indicador heredado que enruta al flujo de venta directa.
                 // La caja seleccionada sí debe tener un turno abierto real.
                 bTurnoIndenpendiente: true,
                 modoVentaDirecta: true,
                 idCaja:this.cajaSeleccionada,
                 idTurno: this.cajaActual.TurnoAbierto.IdTurno
               }
       });
       dialogTurno.afterClosed().subscribe(resultado => {
         if (resultado?.estado === 'Cobrado') {
           this.dialogRef.close(resultado);
         }
       });
    }

 
  }

  private get cajaActual(): CajaDto | undefined {
    return this.listCaja.find(item => item.IdCaja === this.cajaSeleccionada);
  }

  private calcularImpuestosLinea(item: ProductElement): number {
    const impuestos = item.Impuestos ?? [];
    const tasa = impuestos.reduce(
      (total, impuesto) => total + Number(impuesto.Tasa || 0),
      0,
    );
    const fijoPorUnidad = impuestos.reduce(
      (total, impuesto) => total + Number(impuesto.FijoPorUnidad || 0),
      0,
    );
    const importe = Math.max(0, item.Total - item.MontoDscto);
    const fijo = this.redondear(fijoPorUnidad * item.Qty);
    const baseConImpuesto = Math.max(0, importe - fijo);
    const proporcional = tasa <= 0
      ? 0
      : this.redondear(baseConImpuesto - (baseConImpuesto / (1 + tasa)));
    return fijo + proporcional;
  }

  private normalizarCodigoMoneda(value: string | null | undefined): string {
    const codigo = value?.trim().toUpperCase() ?? '';
    if (codigo === 'SOL' || codigo === 'SOLES') return 'PEN';
    if (codigo === 'DOL' || codigo === 'DOLARES' || codigo === 'DÓLARES') {
      return 'USD';
    }
    if (codigo === 'EURO' || codigo === 'EUROS') return 'EUR';
    return codigo || 'PEN';
  }

  private precioMinimoEnMonedaVenta(product: VentaDirectaProducto): number {
    const minimo = Number(product.PrecioMinimo || 0);
    const monedaProducto = this.normalizarCodigoMoneda(product.IdMoneda);
    if (monedaProducto === 'PEN' && this.monedaSeleccionada === 'USD') {
      return this.redondear(minimo / parseFloat(this.tipoCambioCompra));
    }
    if (monedaProducto === 'USD' && this.monedaSeleccionada === 'PEN') {
      return this.redondear(minimo * parseFloat(this.tipoCambioVenta));
    }
    return this.redondear(minimo);
  }

  private simboloPorCodigo(codigo: string): string {
    return ({ PEN: 'S/', USD: 'US$', EUR: '€' } as Record<string, string>)[codigo]
      ?? codigo;
  }

  private redondear(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
