import { Component, Inject, signal, ViewEncapsulation, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ClienteService } from 'src/app/services/cliente.service';
import Swal from 'sweetalert2';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { TipoDocCliente } from 'src/app/models/tipodoccliente.models';
import { TipoDocumento } from 'src/app/models/tipodocumento.models';
import { Tarjeta } from 'src/app/models/tarjeta.models';
import { Pago } from 'src/app/models/pago.models';
import { TipoDocClienteService } from 'src/app/services/tipodoccliente.service';
import { TipoDocumentoService } from 'src/app/services/tipodocumento.service';
import { StorageService } from '../../services/storage.service';
import { PedidoService } from 'src/app/services/pedido.service';
import { TarjetaService } from 'src/app/services/tarjeta.service';
import { EnumTipoDocumento, EnumTipoIdentidad } from '../../enums/enum';
import { CajaService } from 'src/app/services/caja.service';
import { Caja } from 'src/app/models/caja.models';
import { Cliente } from 'src/app/models/cliente.models';
import { Venta } from 'src/app/models/venta.models';

import { FormGroup, Validators, AbstractControl, ValidatorFn, FormControl, FormBuilder } from '@angular/forms';
import { PedidoCab } from 'src/app/models/pedido.models';
import { VentaService } from 'src/app/services/venta.service';
import { PdfService } from 'src/app/services/pdf.service';
import { merge } from 'rxjs';

@Component({
  selector: 'app-dialog-emitir-comprobante',
  templateUrl: './dialog-emitir-comprobante.component.html',
  styleUrls: ['./dialog-emitir-comprobante.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DialogEmitirComprobanteComponent {

  listTipoDocumentoCliente: TipoDocCliente[];
  listTipoDocumento: TipoDocumento[];
  listTarjeta: Tarjeta[];


  ChkVentaAlCredito: boolean = false;
  tipoDocCliente: TipoDocCliente = new TipoDocCliente({ IdTipoIdentidad: 0 });
  cliente: Cliente = new Cliente({ TipoIdentidad: this.tipoDocCliente });

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

  tipoDocumento: TipoDocumento = new TipoDocumento();
  idModuloVenta: number = 0;
  idPedidoCobrar: number = 0;
  nroCuentaCobrar: number = 0;
  idCaja: string = '';


  displayedColumns: string[] = ['tarjeta', 'autorizacion', 'montoPagado', 'propina', 'acciones'];
  dataSource: MatTableDataSource<Pago>;
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
  spinnerService: any;
  errorMessage = signal('');


  constructor(
    public dialogRef: MatDialogRef<DialogEmitirComprobanteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private clienteService: ClienteService,
    private cajaService: CajaService,
    private pedidoService: PedidoService,
    private ventaService: VentaService,
    private storageService: StorageService,
    private tipoDocClienteService: TipoDocClienteService,
    private tipoDocumentoService: TipoDocumentoService,
    private tarjetaService: TarjetaService,
    public dialog: MatDialog,
    private pdfService: PdfService,
    private fb: FormBuilder,
  ) {


    this.dataSource = new MatTableDataSource([]);
    this.nuevoRegistro.Tarjeta = new Tarjeta();
    this.lblcambio = parseFloat(data.lblcambio).toFixed(2);
    this.tipoDocumento.IdTipoDoc = data.idTipoDoc;
    this.idModuloVenta = data.idModuloVenta;
    this.idCaja = data.idCaja;

    this.bTurnoIndenpendiente = data.bTurnoIndenpendiente;
    this.pedidoCab = data.pedidoCab;
    this.idTurno = data.idTurno;
    if (this.idModuloVenta === 3) {
      if (data.ruc.trim() != "" && data.ruc.trim() != "0") {
        this.cliente.Ruc = data.ruc;
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
    this.cliente.TipoIdentidad = new TipoDocCliente({ IdTipoIdentidad: EnumTipoIdentidad.RUC, Descripcion: 'RUC' });

    if (this.tipoDocumento.IdTipoDoc == EnumTipoDocumento.FacturaVenta) {
      this.rucLength = 11;
    } else {
      this.rucLength = 8;
    }

    this.form = this.fb.group({
      idTipoDoc: [this.tipoDocumento.IdTipoDoc, Validators.required],
      serie: ['', Validators.required],
      lblcorrelativo: ['', Validators.required],
      cliente: this.fb.group({
        tipoIdentidad: [this.cliente.TipoIdentidad.IdTipoIdentidad, Validators.required],
        ruc: [this.cliente.Correo, [Validators.required]],
        razonSocial: [this.cliente.RazonSocial, [Validators.required, this.razonSocialValidator()]],
        direccion: [this.cliente.Direccion],
        correo: [this.cliente.Correo]
      })
    });

  }

  async ngOnInit() {
    this.initializeValoresCaja();
    this.ValidaTotalAPagar();

    await this.initializeTipoDocCliente();
    await this.initializeTipoDocumento();

    this.initializeTarjetas();

    this.form.get('cliente.tipoIdentidad').valueChanges.subscribe(() => {
      this.updateRucValidator();
      this.form.get('cliente').updateValueAndValidity();
    });

    this.form.get('idTipoDoc').valueChanges.subscribe(() => {
      this.updateRucValidator();
    });

    this.form.get('cliente.ruc').valueChanges.subscribe(() => {
      this.form.get('cliente.razonSocial').updateValueAndValidity();
    });
  }


  agregarRegistro() {
    this.agregarDatos();
    this.calcularMonto();
    this.calculoMontosTarjeta();
  }

  tipoDocumentoClienteChange() {
    const tipoIdentidad = this.form.get('cliente.tipoIdentidad').value;
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
    const idTipoDoc = this.form.get('idTipoDoc').value;

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
        console.log(ruc);
        console.log(razonSocial);
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
    if (this.idModuloVenta === 1 || this.idModuloVenta === 2 || this.idModuloVenta === 3) {
      this.pedidoService.totalapagar_x_detallepedido(this.idPedidoCobrar, this.nroCuentaCobrar).subscribe(
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

    this.cajaService.getCaja(this.idCaja).subscribe(
      (caja: Caja) => {
        if (caja.IdCaja) {

          if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta) {
            serie = caja.NroSerieBoleta;
            correlativo = ("00000000" + (caja.NroBoleta + 1)).slice(-8);
          } else if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.Express) {
            serie = caja.NroSerieDocInt;
            correlativo = ("00000000" + (caja.NroDocInt + 1)).slice(-8);
          } else if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.FacturaVenta) {
            serie = caja.NroSerieFactura;
            correlativo = ("00000000" + (caja.NroFactura + 1)).slice(-8);
          }
          this.form.patchValue({
            serie: serie,
            lblcorrelativo: correlativo
          });

        } else {
          Swal.fire({
            title: 'Sistema',
            text: `No se encontro informacion de CAJA. Tiempo de espera agotado.`,
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

  private async initializeTipoDocCliente(): Promise<void> {
    let allTipoDocumentoCliente = await this.tipoDocClienteService.getTipoDocClientes().toPromise();
    let ruc;
    let razonSocial;
    if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta) {
      this.listTipoDocumentoCliente = allTipoDocumentoCliente.filter(doc => doc.IdTipoIdentidad !== 2);
      this.cliente.TipoIdentidad = allTipoDocumentoCliente.find(doc => doc.IdTipoIdentidad === EnumTipoIdentidad.DNI) || null;
      this.etiquetaCliente = 'DNI';
      ruc = '00000001';
      razonSocial = 'Cliente Varios';
    } else if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.FacturaVenta) {
      this.listTipoDocumentoCliente = allTipoDocumentoCliente.filter(doc => doc.IdTipoIdentidad === 2);
      this.cliente.TipoIdentidad = allTipoDocumentoCliente.find(doc => doc.IdTipoIdentidad === EnumTipoIdentidad.RUC) || null;
      this.etiquetaCliente = 'RUC';
      ruc = '';
      razonSocial = '';
    }

    const clienteFormGroup = this.form.get('cliente') as FormGroup;
    clienteFormGroup.patchValue({
      tipoIdentidad: this.cliente.TipoIdentidad.IdTipoIdentidad,
      ruc: ruc,
      razonSocial: razonSocial
    });

  }

  private async initializeTipoDocumento(): Promise<void> {
    let allTipoDocumento = await this.tipoDocumentoService.getTipoDocumento().toPromise();

    if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDoc === EnumTipoDocumento.BoletaVentaManual || doc.IdTipoDoc === EnumTipoDocumento.BolentaVenta);
      this.tipoDocumento.IdTipoDoc = EnumTipoDocumento.BolentaVenta;
    } else if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.FacturaVenta) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDoc === EnumTipoDocumento.FacturaVentaManual || doc.IdTipoDoc === EnumTipoDocumento.FacturaVenta);
      this.tipoDocumento.IdTipoDoc = EnumTipoDocumento.FacturaVenta;
    }

    this.form.patchValue({
      IdTipoDoc: this.tipoDocumento.IdTipoDoc
    });


  }

  private async initializeTarjetas(): Promise<void> {
    try {
      if (this.idModuloVenta === 3) {
        this.listTarjeta = await this.tarjetaService.getTarjeta_SocioNegocio(this.idPedidoCobrar, this.nroCuentaCobrar).toPromise();
        if (this.listTarjeta.length != 0) {
          this.cliente.Ruc = "00000000";
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
        this.dataSource.data.forEach(row => {
          monto1 += row.MontoPagado;
        });

        monto1 += nuevoRegistro.MontoPagado;

        if (monto1 > parseFloat(this.lblmonto)) {
          Swal.fire('Monto de tarjeta sobrepasa el monto a pagar', 'Monto', 'info');
          // Focus on txtmontarjeta
        } else {
          this.lblmontotarjeta = monto1.toFixed(2);
          if (nuevoRegistro.Tarjeta.IdTarjeta && nuevoRegistro.Autorizacion && nuevoRegistro.MontoPagado) {
            const data = this.dataSource.data;
            data.push(nuevoRegistro);
            this.dataSource.data = data;
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
    this.dataSource.data = this.dataSource.data.filter(registro => registro !== element);
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


  obtenerDolares(): void {
    this.ComponenteCantidad('Dolares').then(valor => {
      this.dolaresValue = Number(valor);
      this.lblcal = ((this.dolaresValue) * parseFloat(this.lblcambio)).toFixed(2);
      this.calcularMonto();
    });
  }

  command3Click(): void {
    this.dataSource.data = []; // Clear the data grid
    this.dolaresValue = 0;
    this.solesValue = parseFloat(this.lblmonto);
    this.calculoMontosTarjeta();
    this.cmdCobrarClick();
  }

  cmdCobrarClick(): void {
    try {

      if (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.FacturaVenta) {
        if (!this.cliente.Ruc || this.cliente.Ruc === '99999999999') {
          Swal.fire('Validación', 'Ingrese el Ruc del Cliente Correctamente', 'warning');
          return;
        }
        if (!this.cliente) {
          Swal.fire('Validación', 'Ingrese el Cliente', 'warning');
          return;
        }
        if (this.cliente.Ruc.length !== 11) {
          Swal.fire('Validación', 'El RUC debe tener 11 caracteres.', 'warning');
          return;
        }
        if (!this.isNumeric(this.cliente.Ruc)) {
          Swal.fire('Validación', 'El RUC solo debe tener números.', 'warning');
          return;
        }
      } else {
        const tipoDocumentoCliente = this.cliente.TipoIdentidad;
        if (tipoDocumentoCliente.IdTipoIdentidad === 1) {
          if (this.cliente.Ruc === '00000001' && this.cliente.RazonSocial !== 'Cliente Varios') {
            Swal.fire('Validación', 'Si el DNI es : 00000001, entonces el nombre del Cliente debe ser : Cliente Varios', 'warning');
            return;
          }
          if (this.cliente.Ruc !== '00000001' && this.cliente.RazonSocial === 'Cliente Varios') {
            Swal.fire('Validación', 'Si el nombre del Cliente es : Cliente Varios, entonces el DNI debe ser 00000001', 'warning');
            return;
          }
          if (this.cliente.Ruc.length !== 8) {
            Swal.fire('Validación', 'El DNI debe tener 8 caracteres.', 'warning');
            return;
          }
          if (!this.isNumeric(this.cliente.Ruc)) {
            Swal.fire('Validación', 'El DNI solo debe tener números.', 'warning');
            return;
          }
        }

        if (parseFloat(this.lblmonto) >= 700 && (this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta || this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BoletaVentaManual)) {
          if (this.cliente.Ruc === '00000001') {
            Swal.fire('Validación', 'La cuenta es igual ó superior a 700 soles, por lo cual, debe ingresar el DNI del cliente.', 'warning');
            return;
          }
        }
      }

      if (this.cliente.Correo == '') {
        if (!this.isValidEmail(this.cliente.Correo)) {
          Swal.fire('Cliente Delivery', 'El correo electrónico está mal ingresado.', 'warning');
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


    if (!((this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BolentaVenta || this.tipoDocumento.IdTipoDoc === EnumTipoDocumento.BoletaVentaManual) && this.storageService.getCurrentSession().boletaRapida)) {
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

  async procesarCobro(alCredito: boolean): Promise<void> {
    if (!this.ChkVentaAlCredito && parseFloat(this.lbltotal) < parseFloat(this.lblmonto)) {
      Swal.fire('Mensaje', 'El Total de Pago es menor que el Monto a Pagar', 'warning');
      return;
    }
    const venta: Venta = await this.grabarDocumento();
    if (venta) {
      if (this.idModuloVenta === 4) {

        Swal.fire({
          title: '¿Qué formato prefieres?',
          text: "Elige una opción",
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'A4',
          cancelButtonText: 'Ticket'
        }).then((result) => {
          if (result.isConfirmed) {
            this.descargarPDFA4();
            this.imprimirPromocionesA4();
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            this.imprimirTicket(venta.ByteTicket);
            this.imprimirPromocionesTicket();
          }
        });
      } else {
        this.descargarTicketPDF(venta.ByteTicket, venta.Serie + venta.NumDocumento);
      }

      if (this.idModuloVenta === 3) {
        this.imprimirPrecDelivery(venta.IdVenta);
      }

      if (this.idModuloVenta === 5) {
        this.imprimirPrecTragoGratis(venta.IdVenta);
      }

      //  dblReportaMonto = Convert.ToDouble(lblmonto.Text);
      //  dblReportaTotal = Convert.ToDouble(lbltotal.Text);
      //  dblReportaVuelto = Convert.ToDouble(lblvuelto.Text);

      this.dialogRef.close('Cobrado');
    }
  }
  imprimirPromocionesA4() {
    throw new Error('Method not implemented.');
  }
  imprimirPromocionesTicket() {
    throw new Error('Method not implemented.');
  }
  descargarPDFA4() {
    throw new Error('Method not implemented.');
  }
  imprimirPrecTragoGratis(intCodVenta: any) {
    throw new Error('Method not implemented.');
  }
  imprimirPrecDelivery(intCodVenta: any) {
    throw new Error('Method not implemented.');
  }

  imprimirTicket(byteTicket: any) {
    const printerName = 'FACTURA'; // Nombre de la impresora opcional

    this.pdfService.imprimirTicket(byteTicket, printerName);
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

  async grabarDocumento(): Promise<Venta> {
    const listPago: Pago[] = [];

    var UsuReg: number = this.storageService.getCurrentSession().User.IdUsuario;

    const venta: Venta = ({
      IdVenta: 0,
      IdTipoDocumento: this.tipoDocumento.IdTipoDoc,
      NumDocumento: parseInt(this.form.get('lblcorrelativo').value),
      Serie: this.form.get('serie').value,
      IdPedido: this.idPedidoCobrar,
      NroCuenta: this.nroCuentaCobrar,
      IdCaja: this.idCaja,
      Impuesto1: parseFloat(this.lblmonto) - this.dblTotal,
      Total: this.dblTotal,
      Importe: this.dblImporte,
      Dscto: this.dblDscto,
      UsuRegistra: UsuReg,
      IdTurno: this.idTurno,
      oCliente: this.cliente,
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
        Tarjeta: { IdTarjeta: '', Descripcion: '' },
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
        Tarjeta: { IdTarjeta: '', Descripcion: '' },
        Autorizacion: '',
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        Estado: 1,
        IdTurno: this.idTurno
      };
      listPago.push(pagoDolares);
    }

    this.dataSource.data.forEach(row => {
      const pagoTable: Pago = {
        IdVenta: 0,
        IdTipoPago: '004',
        MontoPagado: row.MontoPagado,
        MontoVenta: parseFloat(this.lblmonto),
        Propina: row.Propina,
        Vuelto: 0,
        Tarjeta: row.Tarjeta,
        Autorizacion: row.Autorizacion,
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        Estado: 1,
        IdTurno: this.idTurno
      };
      listPago.push(pagoTable);
    });


    try {

      var resultGenerateComprobante: Venta = await this.ventaService.guardarDocumentoVenta(this.idModuloVenta, venta, this.cliente, this.pedidoCab, listPago, this.bTurnoIndenpendiente).toPromise();
      if (resultGenerateComprobante) {
        return resultGenerateComprobante;
      } else {
        return null;
      }

    } catch (e) {
      this.data.Resultado = "false";
      console.log(e);
      Swal.fire(
        'No se pudo registrar el pedido.',
        e.error,
        'error'
      )
    }
  }

  buscarCliente(): void {

    if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.DNI && this.cliente.Ruc.length != 8) {
      Swal.fire({
        title: 'Validación',
        text: `El DNI debe tener 8 caracteres.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    } else if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.RUC && this.cliente.Ruc.length != 11) {
      Swal.fire({
        title: 'Validación',
        text: `El RUC debe tener 11 caracteres.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    } else if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.DNI && this.cliente.Ruc == '00000001') {
      return;
    }

    this.clienteService.ServicioBuscarCliente(this.cliente.Ruc, this.cliente.TipoIdentidad.IdTipoIdentidad).subscribe(
      (clienteBuscar: any) => {
        if (clienteBuscar) {
          if (clienteBuscar.RazonSocial) {
            this.cliente.Ruc = clienteBuscar.Ruc;
            this.cliente.RazonSocial = clienteBuscar.RazonSocial;
            this.cliente.Direccion = clienteBuscar.Direccion;
            this.cliente.Correo = clienteBuscar.Correo;
          } else {
            Swal.fire({
              title: 'Validación',
              text: `No se encontró el Cliente .`,
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            this.cliente.IdCliente = '';
            this.cliente.Ruc = '';
            this.cliente.RazonSocial = '';
            this.cliente.Direccion = '';
            this.cliente.Correo = '';
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

      this.dataSource.data.forEach(row => {
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
