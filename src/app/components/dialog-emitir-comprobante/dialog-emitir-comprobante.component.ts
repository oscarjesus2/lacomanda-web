import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { Caja } from 'src/app/models/caja.models';
import { Cliente } from 'src/app/models/cliente.models';
import { Pago } from 'src/app/models/pago.models';
import { PedidoCab } from 'src/app/models/pedido.models';
import { Tarjeta } from 'src/app/models/tarjeta.models';
import { TipoIdentidad } from 'src/app/models/tipoIdentidad.models';
import { TipoDocumentoPais } from 'src/app/models/tipodocumentopais.models';
import { Venta } from 'src/app/models/venta.models';

import { CajaService } from 'src/app/services/caja.service';
import { ClienteService } from 'src/app/services/cliente.service';
import { PedidoService } from 'src/app/services/pedido.service';
import { StorageService } from 'src/app/services/storage.service';
import { TarjetaService } from 'src/app/services/tarjeta.service';
import { TipoDocClienteService } from 'src/app/services/tipodoccliente.service';
import { TipoDocumentoService } from 'src/app/services/tipodocumento.service';
import { VentaService } from 'src/app/services/venta.service';

import { EnumTipoDocumento, EnumTipoIdentidad } from 'src/app/enums/enum';

import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { Router } from '@angular/router';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { DescuentoCodigo } from 'src/app/models/descuentocodigo.models';
import { NgxSpinnerService } from 'ngx-spinner';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { TipoDocumentoPaisService } from 'src/app/services/tipo-documento-pais.service';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import { CajaTipoDocumentoService } from 'src/app/services/caja-tipo-documento.service';


@Component({
  selector: 'app-dialog-emitir-comprobante',
  templateUrl: './dialog-emitir-comprobante.component.html',
  styleUrls: ['./dialog-emitir-comprobante.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DialogEmitirComprobanteComponent implements OnInit {

  listTipoDocumentoCliente: TipoIdentidad[] = [];
  listTipoDocumento: CajaTipoDocumento[] = [];
  listTarjeta: Tarjeta[] = [];

  ChkVentaAlCredito: boolean = false;
  tipoIdentidad: TipoIdentidad = new TipoIdentidad({ IdTipoIdentidad: '' });
  cliente: Cliente = new Cliente({ TipoIdentidad: this.tipoIdentidad });

  SerieEnabled: boolean = false;
  CorrelativoEnabled: boolean = false;

  solesValue: number = 0;
  dolaresValue: number = 0;
  tarjetaValue: number = 0;
  lbltotal: string = '0';
  lblvuelto: string = '0';
  lblpropinas: string = '0';
  Label14: string = '';
  lblmontotarjeta: string = '0.00';
  etiquetaCliente: string = '';

  lblcal: string = '0.00';
  lblmonto: string = '0.00';
  lblMontoTotal: string = '0.00';
  lblMontoImpuesto: string = '0.00';
  lblcambio: string = '0.00';

  tipoDocumento: CajaTipoDocumento = new CajaTipoDocumento();
  idTipoPedido: string = '';
  idPedidoCobrar: number = 0;
  nroCuentaCobrar: number = 0;
  idCaja: number = 0;

  displayedColumns: string[] = ['tarjeta', 'autorizacion', 'montoPagado', 'propina', 'acciones'];
  dataSourcePago: MatTableDataSource<Pago>;
  nuevoRegistro: Pago = new Pago();

  form: FormGroup;
  emailPattern = "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$";
  rucLength: number;
  dblImporte: number;
  dblDscto: number;
  dblTotal: number;
  bTurnoIndenpendiente: boolean;
  pedidoCab: PedidoCab;
  idTurno: number;
  listaDescuentoCodigo: DescuentoCodigo[] = [];

  constructor(
    public dialogRef: MatDialogRef<DialogEmitirComprobanteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private clienteService: ClienteService,
    private cajaService: CajaService,
    private spinnerService: NgxSpinnerService,
    private pedidoService: PedidoService,
    private ventaService: VentaService,
    private storageService: StorageService,
    private tipoDocClienteService: TipoDocClienteService,
    private cajaTipoDocumentoService: CajaTipoDocumentoService,
    private tarjetaService: TarjetaService,
    public dialog: MatDialog,
    private fb: FormBuilder,
    private qzTrayService: QzTrayV224Service,
    private router: Router,
  ) {
    this.dataSourcePago = new MatTableDataSource([]);
    this.nuevoRegistro.Tarjeta = new Tarjeta();
    this.lblcambio = parseFloat(data.lblcambio).toFixed(2);
    this.tipoDocumento.IdTipoDocumento = data.idTipoDoc;
    this.idTipoPedido = data.idTipoPedido;
    this.idCaja = data.idCaja;

    this.bTurnoIndenpendiente = data.bTurnoIndenpendiente;
    this.pedidoCab = data.pedidoCab;
    this.listaDescuentoCodigo = data.listaDescuentoCodigo;
    this.idTurno = data.idTurno;
    if (this.idTipoPedido === '003') {
      if (data.ruc.trim() != "" && data.ruc.trim() != "0") {
        this.cliente.NumeroIdentificacion = data.ruc;
        this.cliente.IdCliente = data.idClienteDelivery;
        this.cliente.RazonSocial = data.clienteDelivery
        this.cliente.Direccion = data.direccion;
        this.cliente.Correo = data.correo;
      }
    }

    this.dblImporte = data.dblImporte;
    this.dblDscto = data.dblDscto;
    this.dblTotal = data.dblTotal;
    this.lblmonto = parseFloat(data.dblGranTotal).toFixed(2);
    this.idPedidoCobrar = data.idPedidoCobrar;
    this.nroCuentaCobrar = data.nroCuentaCobrar
    this.cliente.TipoIdentidad = new TipoIdentidad({ IdTipoIdentidad: EnumTipoIdentidad.RUC, Descripcion: 'RUC' });

    if (this.tipoDocumento.IdTipoDocumento == EnumTipoDocumento.FacturaVenta) {
      this.rucLength = 11;
    } else {
      this.rucLength = 8;
    }

    this.form = this.fb.group({
      idTipoDoc: [this.tipoDocumento.IdTipoDocumento, Validators.required],
      serie: ['', Validators.required],
      lblcorrelativo: ['', Validators.required],
      cliente: this.fb.group({
        tipoIdentidad: [this.cliente.TipoIdentidad.IdTipoIdentidad, Validators.required],
        ruc: [this.cliente.NumeroIdentificacion, [Validators.required, this.rucValidator(this.rucLength, this.cliente.RazonSocial)]],
        razonSocial: [this.cliente.RazonSocial, [Validators.required, this.razonSocialValidator()]],
        direccion: [this.cliente.Direccion],
        correo: [this.cliente.Correo, [Validators.pattern(this.emailPattern)]]
      })
    });
  }

  async ngOnInit() {

    if (this.idTipoPedido != '004') {
      const isRunning = await this.qzTrayService.isQzTrayRunning();
      if (!isRunning) {
        // Redirige a una página que instruya al usuario a descargar QZ Tray
        this.router.navigate(['/qz-tray-required']);
      }
    }

    this.ValidaTotalAPagar();

    await this.initializeTipoDocCliente();
    await this.initializeTipoDocumento();
    await this.initializeValoresCaja();

    await this.initializeTarjetas();

    this.form.get('cliente.tipoIdentidad')?.valueChanges.subscribe(() => {
      this.updateRucValidator();
      this.form.get('cliente')?.updateValueAndValidity();
    });

    this.form.get('idTipoDoc')?.valueChanges.subscribe(() => {
      this.updateRucValidator();
    });

    this.form.get('cliente.ruc')?.valueChanges.subscribe(() => {
      this.form.get('cliente.razonSocial')?.updateValueAndValidity();
    });
  }

  agregarRegistro() {
    this.agregarDatos();
    this.calcularMonto();
    this.calculoMontosTarjeta();
  }

  tipoDocumentoClienteChange() {
    const tipoIdentidad = this.form.get('cliente.tipoIdentidad')?.value;
    const clienteFormGroup = this.form.get('cliente') as FormGroup;
    clienteFormGroup.patchValue({
      ruc: '',
      razonSocial: ''
    });

    if (tipoIdentidad === EnumTipoIdentidad.DNI) {
      this.etiquetaCliente = 'DNI';
      clienteFormGroup.patchValue({
        ruc: '00000001',
        razonSocial: 'Cliente Varios'
      });
    }
    if (tipoIdentidad === EnumTipoIdentidad.RUC) {
      this.etiquetaCliente = 'RUC';
    }
    if (tipoIdentidad === EnumTipoIdentidad.CARNETEXT) {
      this.etiquetaCliente = 'CARNETEXT';
    }
    if (tipoIdentidad === EnumTipoIdentidad.PASAPORTE) {
      this.etiquetaCliente = 'PASAPORTE';
    }
    if (tipoIdentidad === EnumTipoIdentidad.OTROS) {
      this.etiquetaCliente = 'OTROS';
    }
    clienteFormGroup.updateValueAndValidity(); // Asegúrate de que el grupo de controles se actualice
  }

  onTipoDocumentoChange(): void {
    const idTipoDoc = this.form.get('idTipoDoc')?.value;
    console.log(idTipoDoc);
    if (idTipoDoc === 'BM' || idTipoDoc === 'FM') {
      this.CorrelativoEnabled = true;
      this.SerieEnabled = true;
      const clienteFormGroup = this.form.get('cliente') as FormGroup;
      clienteFormGroup.patchValue({
        serie: '',
        lblcorrelativo: ''
      });

    } else {
      this.CorrelativoEnabled = false;
      this.SerieEnabled = false;
      this.initializeValoresCaja();
    }
  }

  updateRucValidator() {
    const tipoIdentidadControl = this.form.get('cliente.tipoIdentidad');
    const rucControl = this.form.get('cliente.ruc');
    const razonSocialControl = this.form.get('cliente.razonSocial');

    if (tipoIdentidadControl && rucControl && razonSocialControl) {
      const tipoIdentidad = tipoIdentidadControl.value;

      // Establece el validador en función del TipoIdentidad
      rucControl.clearValidators(); // Limpia los validadores existentes
      rucControl.updateValueAndValidity();

      if (tipoIdentidad === EnumTipoIdentidad.DNI) {
        this.rucLength = 8;
        rucControl.setValidators([
          Validators.required,
          this.rucValidator(8, razonSocialControl.value)
        ]);
      } else if (tipoIdentidad === EnumTipoIdentidad.RUC) {
        this.rucLength = 11;
        rucControl.setValidators([
          Validators.required,
          this.rucValidator(11, razonSocialControl.value)
        ]);
      }

      rucControl.updateValueAndValidity(); // Actualiza la validez del control
      razonSocialControl.updateValueAndValidity(); // Actualiza la validez de RazonSocial
    }
  }

  rucValidator(length: number, razonSocial: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const ruc = control.value;

      if (ruc && ruc.length !== length) {
        return { length: true };
      }
      if (ruc && !/^\d+$/.test(ruc)) {
        return { pattern: true };
      }

      // Validación adicional para DNI
      if (length === 8 && ruc === '00000001' && parseFloat(this.lblmonto) >= 700) {
        return { invalidRUC: true };
      }

      if (razonSocial === 'Cliente Varios' && ruc != '00000001') {
        return { invalidRUC: true };
      }

      return null;
    };
  }

  // Validador personalizado para RazonSocial
  razonSocialValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      // Verifica si el control tiene un padre
      if (!control.parent) {
        return null; // Si no hay padre, el formulario aún no está listo
      }

      const razonSocial = control.value;
      const rucControl = control.parent.get('ruc'); // Obtén el control 'Ruc' desde el padre

      if (rucControl) {
        const ruc = rucControl.value;
        if (ruc === '00000001' && razonSocial !== 'Cliente Varios') {
          return { invalidRazonSocial: true };
        }
        if (ruc !== '00000001' && razonSocial === 'Cliente Varios') {
          return { invalidRazonSocial: true };
        }
      }

      return null;
    };
  }

  private async ValidaTotalAPagar(): Promise<void> {
    if (this.idTipoPedido === '001' || this.idTipoPedido === '002' || this.idTipoPedido === '003') {
      this.pedidoService.Totalapagar_x_detallepedido(this.idPedidoCobrar, this.nroCuentaCobrar).subscribe(
        (pedido: any) => {
          if (pedido.MontoPagar) {
            let dblPedTot: number = parseFloat(pedido.MontoPagar.toFixed(2));
            let dblGranTotal: number = parseFloat(this.lblmonto);

            if (dblPedTot > 0 && dblGranTotal !== dblPedTot) {
              Swal.fire({
                title: 'Validación',
                text: `El monto calculado no está igual al que muestra la pantalla de caja. Por favor vuelva a intentarlo..`,
                icon: 'warning',
                confirmButtonText: 'OK'
              });

              this.dialogRef.close();
            } else {
              this.lblmonto = dblPedTot.toFixed(2);
              this.lblMontoTotal = parseFloat(pedido.MontoTotal).toFixed(2);
              this.lblMontoImpuesto = parseFloat(pedido.Impuesto).toFixed(2);
            }
          } else {
            Swal.fire({
              title: 'Validación',
              text: `No se pudo obtener el Total a Pagar. Tiempo de espera agotado.`,
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            this.dialogRef.close();
          }
        },
        (error: any) => {
          console.error('Error:', error);
          Swal.fire({
            title: 'Validación',
            text: error,
            icon: 'error',
            confirmButtonText: 'OK'
          });
          this.dialogRef.close();
        }
      );
    }
  }

  private async initializeValoresCaja(): Promise<void> {
    let serie: string = '';
    let correlativo: string = '';
    let cajaTipoDocumento: CajaTipoDocumento[];

    this.cajaService.getCaja(this.idCaja).subscribe({
      next: ({ Data }) => {
        const caja = Data;
        if (!caja || caja.IdCaja <= 0) {
          Swal.fire({ title: 'Sistema', text: 'No se encontró información de CAJA.', icon: 'warning', confirmButtonText: 'OK' });
          this.dialogRef.close();
          return;
        }

        const tipo = this.listTipoDocumento.find(z => z.IdTipoDocumento === this.tipoDocumento?.IdTipoDocumento);
        if (!tipo) {
          Swal.fire({ title: 'Sistema', text: 'No se encontró el tipo de documento seleccionado.', icon: 'warning', confirmButtonText: 'OK' });
          this.dialogRef.close();
          return;
        }

        const serie = tipo.Serie;
        const correlativo = String(tipo.NumeroActual + 1).padStart(8, '0');

        this.form.patchValue({
          serie,
          lblcorrelativo: correlativo,
        });
      },
      error: (error) => {
        console.error('Error:', error);
        Swal.fire({ title: 'Error', text: error?.message ?? 'Error al obtener caja.', icon: 'error', confirmButtonText: 'OK' });
        this.dialogRef.close();
      }
    });

  }

  private async initializeTipoDocCliente(): Promise<void> {
    try {
      var response = await this.tipoDocClienteService.getTipoDocClientes().toPromise();

      const allTipoDocumentoCliente = response.Data;

      let ruc = '';
      let razonSocial = '';
      const isBoletaVenta = this.tipoDocumento.IdTipoDocumento === (EnumTipoDocumento.BoletaVenta);
      const isExpress = this.tipoDocumento.IdTipoDocumento === (EnumTipoDocumento.Express);

      this.listTipoDocumentoCliente = allTipoDocumentoCliente.filter(doc =>
        (isBoletaVenta || isExpress) ? doc.IdTipoIdentidad !== 'RUC' : doc.IdTipoIdentidad === 'RUC'
      );

      this.cliente.TipoIdentidad = allTipoDocumentoCliente.find(doc =>
        (isBoletaVenta || isExpress) ? doc.IdTipoIdentidad === EnumTipoIdentidad.DNI : doc.IdTipoIdentidad === EnumTipoIdentidad.RUC
      ) || null;

      this.etiquetaCliente = (isBoletaVenta || isExpress) ? 'DNI' : 'RUC';

      if (isBoletaVenta || isExpress) {
        ruc = '00000001';
        razonSocial = 'Cliente Varios';
      }

      const clienteFormGroup = this.form.get('cliente') as FormGroup;
      clienteFormGroup.patchValue({
        tipoIdentidad: this.cliente.TipoIdentidad?.IdTipoIdentidad ?? null,
        ruc,
        razonSocial
      });
      this.cliente.IdTipoIdentidad = this.cliente.TipoIdentidad.IdTipoIdentidad;
    } catch (error) {
      console.error('Error al inicializar el tipo de documento del cliente:', error);
      // Aquí puedes manejar errores adicionales, como mostrar una alerta al usuario.
    }
  }


  private async initializeTipoDocumento(): Promise<void> {
    var response = await this.cajaTipoDocumentoService.GetTiposDocumentos(this.idCaja).toPromise();
    let allTipoDocumento = response;
    if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.BoletaVentaManual || doc.IdTipoDocumento === EnumTipoDocumento.BoletaVenta);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.BoletaVenta;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaVenta) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.FacturaVentaManual || doc.IdTipoDocumento === EnumTipoDocumento.FacturaVenta);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.FacturaVenta;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.Express) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.Express);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.Express;
    }

    this.form.patchValue({
      IdTipoDoc: this.tipoDocumento.IdTipoDocumento
    });
  }

  private async initializeTarjetas(): Promise<void> {
    try {
      if (this.idTipoPedido === '003') {
        this.listTarjeta = await this.tarjetaService.getTarjeta_SocioNegocio(this.idPedidoCobrar, this.nroCuentaCobrar).toPromise();
        if (this.listTarjeta.length != 0) {
          this.cliente.NumeroIdentificacion = "00000000";
          this.cliente.RazonSocial = "Cliente Aplicativo";
          this.cliente.IdCliente = "99998";
          this.cliente.TipoIdentidad.IdTipoIdentidad = EnumTipoIdentidad.DNI;
        }
        else {
          this.listTarjeta = await this.tarjetaService.getTarjeta().toPromise();
        }
      }
      else {
        this.listTarjeta = await this.tarjetaService.getTarjeta().toPromise();
      }

    } catch (error) {
      console.error('Error loading TipoDocCliente', error);
      throw error;  // Rethrow to be caught by ngOnInit
    }
  }

  agregarDatos() {
    try {
      const nuevoRegistro: Pago = { ...this.nuevoRegistro };

      if (!nuevoRegistro.Propina) {
        nuevoRegistro.Propina = 0;
      }
      if (!nuevoRegistro.MontoPagado) {
        nuevoRegistro.MontoPagado = 0;
      }
      let monto1 = 0;
      if (nuevoRegistro.MontoPagado > 0) {
        this.dataSourcePago.data.forEach(row => {
          monto1 += row.MontoPagado;
        });

        monto1 += nuevoRegistro.MontoPagado;

        if (monto1 > parseFloat(this.lblmonto)) {
          Swal.fire('Monto de tarjeta sobrepasa el monto a pagar', 'Monto', 'info');
          // Focus on txtmontarjeta
        } else {
          this.lblmontotarjeta = monto1.toFixed(2);
          if (nuevoRegistro.Tarjeta.IdTarjeta && nuevoRegistro.Autorizacion && nuevoRegistro.MontoPagado) {
            const data = this.dataSourcePago.data;
            data.push(nuevoRegistro);
            this.dataSourcePago.data = data;
            this.nuevoRegistro = new Pago();
          }
        }
      } else {
        Swal.fire('Ingresar el monto pagado con Tarjeta', '', 'warning');
        // Focus on txtmontarjeta
      }
    } catch (ex) {
      Swal.fire(ex.message, 'AgregarDatos', 'warning');
    }
  }

  eliminarRegistro(element: Pago) {
    this.dataSourcePago.data = this.dataSourcePago.data.filter(registro => registro !== element);
    this.calcularMonto();
    this.calculoMontosTarjeta();
  }

  salir(): void {
    this.dialogRef.close();
  }

  abrirDialogoCantidad(sTitulo: string): Promise<any> {
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      data: {
        title: sTitulo,
        quantity: '',
        hideNumber: false,
        decimalActive: true,
        minAmount: 1
      }
    });

    return dialogRef.afterClosed().toPromise();
  }

  ComponenteCantidad(titulo: string): Promise<number> {
    return new Promise((resolve) => {
      this.abrirDialogoCantidad(titulo).then(result => {
        if (result) {
          const valor = result.value;
          resolve(valor);
        } else {
          resolve(0);
        }
      }).catch(() => {
        resolve(0);
      });
    });
  }

  obtenerSoles(): void {
    this.ComponenteCantidad('Soles').then(valor => {
      this.solesValue = Number(valor);
      this.calcularMonto();
    });
  }

  SolesPredefinido(valor: number): void {
    this.solesValue = Number(valor);
    this.calcularMonto();
  }

  SolesExacto(): void {
    this.solesValue = Number(this.lblmonto);
    this.calcularMonto();
    this.cmdCobrarClick();
  }

  obtenerDolares(): void {
    this.ComponenteCantidad('Dolares').then(valor => {
      this.dolaresValue = Number(valor);
      this.lblcal = ((this.dolaresValue) * parseFloat(this.lblcambio)).toFixed(2);
      this.calcularMonto();
    });
  }

  command3Click(): void {
    this.dataSourcePago.data = []; // Clear the data grid
    this.dolaresValue = 0;
    this.solesValue = parseFloat(this.lblmonto);
    this.calculoMontosTarjeta();
    this.cmdCobrarClick();
  }

  cmdCobrarClick(): void {
    try {

      this.tipoDocumento.IdTipoDocumento = this.form.get('idTipoDoc')?.value;
      this.cliente.TipoIdentidad = new TipoIdentidad({ IdTipoIdentidad: this.form.get('cliente.tipoIdentidad')?.value, Descripcion: '' })
      this.cliente.NumeroIdentificacion = this.form.get('cliente.ruc')?.value;
      this.cliente.RazonSocial = this.form.get('cliente.razonSocial')?.value;
      this.cliente.Direccion = this.form.get('cliente.direccion')?.value;
      this.cliente.Correo = this.form.get('cliente.correo')?.value;

      if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaVenta) {
        if (!this.cliente.NumeroIdentificacion || this.cliente.NumeroIdentificacion === '99999999999') {
          Swal.fire('Validación', 'Ingrese el Ruc del Cliente Correctamente', 'warning');
          return;
        }
        if (!this.cliente) {
          Swal.fire('Validación', 'Ingrese el Cliente', 'warning');
          return;
        }
        if (this.cliente.NumeroIdentificacion.length !== 11) {
          Swal.fire('Validación', 'El RUC debe tener 11 caracteres.', 'warning');
          return;
        }
        if (!this.isNumeric(this.cliente.NumeroIdentificacion)) {
          Swal.fire('Validación', 'El RUC solo debe tener números.', 'warning');
          return;
        }

        if (this.cliente.Direccion == '' || this.cliente.Direccion == null) {
          Swal.fire('Validacion', 'Ingrese la dirección', 'warning');
          return;
        }

      } else {
        const tipoDocumentoCliente = this.cliente.TipoIdentidad;
        if (tipoDocumentoCliente.IdTipoIdentidad === 'DNI') {
          if (this.cliente.NumeroIdentificacion === '00000001' && this.cliente.RazonSocial !== 'Cliente Varios') {
            Swal.fire('Validación', 'Si el DNI es : 00000001, entonces el nombre del Cliente debe ser : Cliente Varios', 'warning');
            return;
          }
          if (this.cliente.NumeroIdentificacion !== '00000001' && this.cliente.RazonSocial === 'Cliente Varios') {
            Swal.fire('Validación', 'Si el nombre del Cliente es : Cliente Varios, entonces el DNI debe ser 00000001', 'warning');
            return;
          }
          if (this.cliente.NumeroIdentificacion.length !== 8) {
            Swal.fire('Validación', 'El DNI debe tener 8 caracteres.', 'warning');
            return;
          }
          if (!this.isNumeric(this.cliente.NumeroIdentificacion)) {
            Swal.fire('Validación', 'El DNI solo debe tener números.', 'warning');
            return;
          }
        }

        if (parseFloat(this.lblmonto) >= 700 && (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta || this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVentaManual)) {
          if (this.cliente.NumeroIdentificacion === '00000001') {
            Swal.fire('Validación', 'La cuenta es igual ó superior a 700 soles, por lo cual, debe ingresar el DNI del cliente.', 'warning');
            return;
          }
        }
      }

      if (this.cliente.Correo != '' && this.cliente.Correo != null) {
        if (!this.isValidEmail(this.cliente.Correo)) {
          Swal.fire('Validacion', 'El correo electrónico está mal ingresado.', 'warning');
          return;
        }
      }

      this.cobrar(false);
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  isValidEmail(email: string): boolean {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{2,})$/i;
    return re.test(String(email).toLowerCase());
  }

  cobrar(alCredito: boolean): void {
    let mensaje = "¿Está Seguro de Cobrar la Cuenta?";
    if (this.ChkVentaAlCredito) {
      mensaje = "¿Está Seguro de Registrar la Venta al Crédito?";
    }

    if (!((this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta || this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVentaManual) && this.storageService.getCurrentSession().boletaRapida)) {
      Swal.fire({
        title: mensaje,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isConfirmed) {
          this.procesarCobro(alCredito);
        }
      });
    } else {
      if (parseFloat(this.lbltotal) >= parseFloat(this.lblmonto)) {
        this.procesarCobro(alCredito);
      } else {
        Swal.fire('Mensaje', 'El Total de Pago es menor que el Monto a Pagar', 'warning');
      }
    }
  }

  async imprimir(listImpresionDTO: ImpresionDTO[]): Promise<number> {
    let contador: number = 0;

    for (const element of listImpresionDTO) {
      const printerName = element.NombreImpresora;
      const success = await this.qzTrayService.printPDF(element.Documento, printerName);
      if (success) {
        contador += 1;
      }
    }
    return contador;
  }


  async procesarCobro(alCredito: boolean): Promise<void> {
    if (!this.ChkVentaAlCredito && parseFloat(this.lbltotal) < parseFloat(this.lblmonto)) {
      Swal.fire('Mensaje', 'El Total de Pago es menor que el Monto a Pagar', 'warning');
      return;
    }
    const listaImpresionDTO: ImpresionDTO[] = await this.grabarDocumento();
    if (listaImpresionDTO) {
      if (this.idTipoPedido === '005') {

        Swal.fire({
          title: '¿Qué formato prefieres?',
          text: "Elige una opción",
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'A4',
          cancelButtonText: 'Ticket'
        }).then((result) => {
          if (result.isConfirmed) {
            this.descargarA4PDF();
            this.descargarTicketPDF(listaImpresionDTO.find[0].Documento, '');
            this.imprimirPromocionesA4();
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            this.descargarTicketPDF(listaImpresionDTO.find[0].Documento, '');
            this.imprimirPromocionesTicket();
          }
        });
      } else {
        this.imprimir(listaImpresionDTO);
      }

      if (this.idTipoPedido === '003') {
        this.imprimirPrecDelivery(listaImpresionDTO);
      }

      this.dialogRef.close({ estado: 'Cobrado', listaImpresionDTO: listaImpresionDTO });
    }
  }
  imprimirPromocionesA4() {
    throw new Error('Method not implemented.');
  }
  imprimirPromocionesTicket() {
    throw new Error('Method not implemented.');
  }
  descargarA4PDF() {
    throw new Error('Method not implemented.');
  }
  imprimirPrecTragoGratis(intCodVenta: any) {
    throw new Error('Method not implemented.');
  }
  imprimirPrecDelivery(intCodVenta: any) {
    throw new Error('Method not implemented.');
  }

  async imprimirTicket(byteTicket: any) {
    const printerName = 'FACTURA';
    this.qzTrayService.printPDF(byteTicket, printerName);
  }

  descargarTicketPDF(ByteTicket: any, nombreArchivo: string) {
    const byteCharacters = atob(ByteTicket);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = nombreArchivo + '.pdf';
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  async grabarDocumento(): Promise<ImpresionDTO[]> {
    this.spinnerService.show();
    const listPago: Pago[] = [];

    var UsuReg: number = this.storageService.getCurrentSession().User.IdUsuario;

    const venta: Venta = ({
      IdVenta: 0,
      IdCliente: 0,
      Beneficiario: '',
      Estado: 0,
      IdTipoDocumento: this.tipoDocumento.IdTipoDocumento,
      NumDocumento: parseInt(this.form.get('lblcorrelativo')?.value),
      Serie: this.form.get('serie')?.value,
      IdPedido: this.idPedidoCobrar,
      NroCuenta: this.nroCuentaCobrar,
      IdCaja: this.idCaja,
      Impuesto1: parseFloat(this.lblmonto) - this.dblTotal,
      IdEmpleado: this.storageService.getCurrentUser().IdEmpleado,
      Total: this.dblTotal,
      Importe: this.dblImporte,
      Dscto: this.dblDscto,
      UsuRegistra: UsuReg,
      IdTurno: this.idTurno,
      Propina: parseFloat(this.lblpropinas),
      ByteTicket: null
    });

    if (this.solesValue > 0) {

      const pagoSoles: Pago = {

        IdVenta: 0,
        IdTipoPago: '001',
        MontoPagado: this.solesValue,
        MontoVenta: parseFloat(this.lblmonto),
        Propina: 0,
        Vuelto: parseFloat(this.lblvuelto),
        Tarjeta: null,
        Autorizacion: '',
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        Estado: 1,
        IdTurno: this.idTurno
      };

      listPago.push(pagoSoles);
    }

    if (this.dolaresValue > 0) {
      let Vuelto = 0;
      if (this.dolaresValue !== 0 && this.solesValue === 0) {
        Vuelto = parseFloat(this.lblvuelto);
      }

      const pagoDolares: Pago = {
        IdVenta: 0,
        IdTipoPago: '002',
        MontoPagado: parseFloat(this.lblcal),
        MontoVenta: parseFloat(this.lblmonto),
        Propina: 0,
        Vuelto: Vuelto,
        Tarjeta: null,
        Autorizacion: '',
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        Estado: 1,
        IdTurno: this.idTurno
      };
      listPago.push(pagoDolares);
    }

    this.dataSourcePago.data.forEach(row => {
      const pagoTable: Pago = {
        IdVenta: 0,
        IdTipoPago: '004',
        MontoPagado: row.MontoPagado,
        MontoVenta: parseFloat(this.lblmonto),
        Propina: row.Propina,
        Vuelto: 0,
        Tarjeta: new Tarjeta({ IdTarjeta: row.Tarjeta.IdTarjeta, Descripcion: row.Tarjeta.Descripcion }),
        Autorizacion: row.Autorizacion,
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        Estado: 1,
        IdTurno: this.idTurno
      };
      listPago.push(pagoTable);
    });



    var resultGenerateComprobante: ApiResponse<ImpresionDTO[]> = await this.ventaService.guardarDocumentoVenta(this.idTipoPedido, venta, this.cliente, this.pedidoCab, this.listaDescuentoCodigo, listPago, this.bTurnoIndenpendiente).toPromise();
    if (resultGenerateComprobante.Success) {
      this.spinnerService.hide();
      return resultGenerateComprobante.Data;
    } else {
      this.spinnerService.hide();
      return null;
    }
  }

  buscarCliente(): void {

    const ruc = this.form.get('cliente.ruc').value;

    if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.DNI && ruc.length != 8) {
      Swal.fire({
        title: 'Validación',
        text: `El DNI debe tener 8 caracteres.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    } else if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.RUC && ruc.length != 11) {
      Swal.fire({
        title: 'Validación',
        text: `El RUC debe tener 11 caracteres.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    } else if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.DNI && ruc == '00000001') {
      return;
    }

    this.clienteService.ServicioBuscarCliente(ruc, this.cliente.TipoIdentidad.IdTipoIdentidad).subscribe(
      (clienteBuscar: any) => {
        if (clienteBuscar) {
          if (clienteBuscar.RazonSocial) {
            const clienteFormGroup = this.form.get('cliente') as FormGroup;
            clienteFormGroup.patchValue({
              ruc: clienteBuscar.NumeroIdentificacion,
              razonSocial: clienteBuscar.RazonSocial,
              direccion: clienteBuscar.Direccion,
              correo: clienteBuscar.Correo
            });


          } else {
            Swal.fire({
              title: 'Validación',
              text: `No se encontró el Cliente .`,
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            this.cliente.IdCliente = '';
            const clienteFormGroup = this.form.get('cliente') as FormGroup;
            clienteFormGroup.patchValue({
              ruc: '',
              razonSocial: '',
              direccion: '',
              correo: ''
            });
          }
        } else {
          Swal.fire({
            title: 'Validación',
            text: `Vuelve a realizar la búsqueda. Tiempo de espera agotado.`,
            icon: 'warning',
            confirmButtonText: 'OK'
          });
        }
      },
      (error: any) => {
        console.error('Error:', error);
        Swal.fire({
          title: 'Validación',
          text: error,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    );
  }

  calculoMontosTarjeta(): void {
    try {
      let monto = 0;
      let propina = 0;

      this.dataSourcePago.data.forEach(row => {
        monto += row.MontoPagado;
        propina += row.Propina;
      });

      this.tarjetaValue = monto;
      this.lblmontotarjeta = monto.toFixed(2);
      this.lblpropinas = propina.toFixed(2);
      this.lbltotal = (this.solesValue + parseFloat(this.lblcal) + monto).toFixed(2);

      const total = parseFloat(this.lbltotal);
      const montoLbl = parseFloat(this.lblmonto);

      if (total - montoLbl < 0) {
        this.Label14 = 'Falta';
        this.lblvuelto = Math.abs(total - montoLbl).toFixed(2);
      } else {
        this.Label14 = 'Vuelto';
        this.lblvuelto = (total - montoLbl).toFixed(2);
      }
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error + 'Ocurrió un error al calcular los montos',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

  calcularMonto(): void {

    const soles = isNaN(Number(this.solesValue)) ? 0 : Number(this.solesValue);
    const dolaresCambiadoaSoles = parseFloat(this.lblcal);
    const tarjeta = isNaN(Number(this.tarjetaValue)) ? 0 : Number(this.tarjetaValue);

    const total = soles + dolaresCambiadoaSoles + tarjeta;
    this.lbltotal = total.toFixed(2);

    const difference = total - parseFloat(this.lblmonto);

    if (difference < 0) {
      this.Label14 = 'Falta';
      this.lblvuelto = (Math.abs(difference)).toFixed(2);
    } else {
      this.Label14 = 'Vuelto';
      this.lblvuelto = difference.toFixed(2);
    }
  }

  isNumeric(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }

}
