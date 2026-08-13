import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { CajaDto } from 'src/app/models/caja.models';
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
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { Configuracion } from 'src/app/models/configuracion.models';
import { Moneda } from 'src/app/models/moneda.models';

import { EnumTipoDocumento, EnumTipoIdentidad, TipoPagoEnum } from 'src/app/enums/enum';

import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { DescuentoCodigo } from 'src/app/models/descuentocodigo.models';
import { NgxSpinnerService } from 'ngx-spinner';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { TipoDocumentoPaisService } from 'src/app/services/tipo-documento-pais.service';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import { CajaTipoDocumentoService } from 'src/app/services/caja-tipo-documento.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { EstadoImpresionService } from 'src/app/services/estado-impresion.service';


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

  config: Configuracion | null = null;
  monedaPrincipal: Moneda | null = null;
  monedaAlternativa: Moneda | null = null;

  ChkVentaAlCredito: boolean = false;
  tipoIdentidad: TipoIdentidad = new TipoIdentidad({ IdTipoIdentidad: '' });
  cliente: Cliente = new Cliente({ TipoIdentidad: this.tipoIdentidad });

  SerieEnabled: boolean = false;
  CorrelativoEnabled: boolean = false;

  solesValue: number = 0;
  dolaresValue: number = 0;
  tarjetaValue: number = 0;
  lbltotal: string = '0.00';
  lblvuelto: string = '0.00';
  lblpropinas: string = '0.00';
  private faltaPago = false;
  get Label14(): string {
    return this.texts.get(this.faltaPago ? 'remaining' : 'changeDue');
  }
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

  /** true cuando el cliente es opcional para este tipo de documento
   *  (Boleta, BoletaManual, FacturaSimplificada, Express).
   *  El bloque de datos del cliente se oculta por defecto y se muestra bajo demanda. */
  clienteOpcional: boolean = false;
  /** true cuando el bloque de datos del cliente debe mostrarse y ser válido */
  mostrarDatosCliente: boolean = true;
  /** true cuando el cajero activó manualmente "Añadir datos del cliente" */
  clienteSolicitaDatos: boolean = false;

  displayedColumns: string[] = ['tarjeta', 'autorizacion', 'montoPagado', 'propina', 'acciones'];
  dataSourcePago: MatTableDataSource<Pago>;
  nuevoRegistro: Pago = new Pago();

  form: FormGroup;
  emailPattern = "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$";
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
    private configuracionService: ConfiguracionService,
    private monedaService: MonedaService,
    private texts: TenantTextCatalogService,
    private estadoImpresion: EstadoImpresionService,
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
        this.cliente.Email = data.correo;
      }
    }

    this.dblImporte = data.dblImporte;
    this.dblDscto = data.dblDscto;
    this.dblTotal = data.dblTotal;
    this.lblmonto = parseFloat(data.dblGranTotal).toFixed(2);
    this.idPedidoCobrar = data.idPedidoCobrar;
    this.nroCuentaCobrar = data.nroCuentaCobrar
    this.cliente.TipoIdentidad = new TipoIdentidad({
      IdTipoIdentidad: EnumTipoIdentidad.RUC,
      Descripcion: 'Registro Único de Contribuyentes',
      Abreviatura: 'RUC',
    });

    this.form = this.fb.group({
      idTipoDoc: [this.tipoDocumento.IdTipoDocumento, Validators.required],
      serie: ['', Validators.required],
      lblcorrelativo: ['', Validators.required],
      cliente: this.fb.group({
        tipoIdentidad: [this.cliente.TipoIdentidad.IdTipoIdentidad, Validators.required],
        // Validador de formato se aplica dinámicamente en updateRucValidator()
        // una vez que listTipoDocumentoCliente esté cargado desde el backend.
        ruc: [this.cliente.NumeroIdentificacion, [Validators.required]],
        razonSocial: [this.cliente.RazonSocial, [Validators.required, this.razonSocialValidator()]],
        direccion: [this.cliente.Direccion],
        correo: [this.cliente.Email, [Validators.pattern(this.emailPattern)]]
      })
    });
  }

  async ngOnInit() {

    // Cargar configuración y monedas del país
    this.configuracionService.get().subscribe(cfg => {
      this.config = cfg;
      if (cfg?.PaisISO2) {
        this.monedaService.getMonedaPorPais(cfg.PaisISO2).subscribe(res => {
          const monedas = res?.Data ?? [];
          this.monedaPrincipal    = monedas.find(m => m.IdMoneda === cfg.IdMoneda) ?? null;
          this.monedaAlternativa  = monedas.find(m => m.IdMoneda !== cfg.IdMoneda) ?? null;
        });
      }
    });

    this.ValidaTotalAPagar();

    await this.initializeTipoDocumento();   // primero: detecta isFactSimplificadaES
    await this.initializeTipoDocCliente(); // segundo: usa isFactSimplificadaES para saber si omitir cliente
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

    // Actualizar etiqueta con el id del tipo seleccionado
    this.etiquetaCliente = tipoIdentidad ?? '';

    // Limpiar campos de cliente
    clienteFormGroup.patchValue({ ruc: '', razonSocial: '' });

    // Para DNI: pre-rellenar con "Cliente Varios" cuando es Boleta/FactSimplificada/Express
    const isBoletaVenta      = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta;
    const isExpress          = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.Express;
    const isFactSimplificada = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaSimplificada;
    const isBoletaManual     = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaManual;
    if ((isBoletaVenta || isExpress || isFactSimplificada || isBoletaManual) && tipoIdentidad === EnumTipoIdentidad.DNI) {
      clienteFormGroup.patchValue({ ruc: '00000001', razonSocial: 'Cliente Varios' });
    }

    clienteFormGroup.updateValueAndValidity();
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

  /**
   * Valida el número de identificación contra RegexValidacion del backend.
   * Devuelve el mensaje de error, o null si es válido.
   * Punto único de verdad: usado en el form validator, cmdCobrarClick y buscarCliente.
   */
  private validarNumeroIdentificacion(value: string, tipoIdentidad: TipoIdentidad | null): string | null {
    if (!value || !tipoIdentidad) return null;

    const regexStr = tipoIdentidad.RegexValidacion;
    if (regexStr) {
      try {
        if (!new RegExp(regexStr).test(value)) {
          const hint = tipoIdentidad.Mascara ? ` (esperado: ${tipoIdentidad.Mascara})` : '';
          const etiqueta = tipoIdentidad.Abreviatura || tipoIdentidad.Descripcion;
          return `Formato de ${etiqueta} inválido${hint}.`;
        }
      } catch {
        console.warn('RegexValidacion inválido desde backend:', regexStr);
      }
    } else {
      // Fallback si el backend no envía RegexValidacion
      if (tipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.DNI) {
        if (value.length !== 8) return 'El DNI debe tener 8 caracteres.';
        if (!/^\d+$/.test(value)) return 'El DNI solo debe tener números.';
      } else if (tipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.RUC) {
        if (value.length !== 11) return 'El RUC debe tener 11 caracteres.';
        if (!/^\d+$/.test(value)) return 'El RUC solo debe tener números.';
      }
    }
    return null;
  }

  /** TipoIdentidad actualmente seleccionado (para usar en template y validators). */
  get selectedTipoIdentidad(): TipoIdentidad | null {
    const id = this.form?.get('cliente.tipoIdentidad')?.value;
    return this.listTipoDocumentoCliente?.find(t => t.IdTipoIdentidad === id) ?? null;
  }

  /**
   * Aplica el validador de formato al campo RUC/documento usando
   * el RegexValidacion que viene del backend en TipoIdentidad.
   * Si el backend no lo provee, hace fallback a la lógica anterior.
   */
  updateRucValidator() {
    const rucControl        = this.form?.get('cliente.ruc');
    const razonSocialControl = this.form?.get('cliente.razonSocial');
    if (!rucControl || !razonSocialControl) return;

    const tipoIdentidad = this.selectedTipoIdentidad;

    rucControl.clearValidators();
    rucControl.setValidators([
      Validators.required,
      this.rucValidator(tipoIdentidad)
    ]);
    rucControl.updateValueAndValidity();
    razonSocialControl.updateValueAndValidity();
  }

  /**
   * Valida el número de identificación contra RegexValidacion del backend.
   * Fallback a reglas hardcoded solo si el backend no envía regex.
   */
  rucValidator(tipoIdentidad: TipoIdentidad | null): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const value: string = control.value ?? '';
      if (!value) return null;

      // Delega al método centralizado
      const error = this.validarNumeroIdentificacion(value, tipoIdentidad);
      if (error) return { pattern: true };

      // Regla de negocio: "00000001" no válido para montos ≥ 700
      if (value === '00000001' && parseFloat(this.lblmonto) >= 700) {
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
                title: this.texts.get('validation'),
                text: this.texts.get('calculatedTotalMismatch'),
                icon: 'warning',
                confirmButtonText: this.texts.get('accept')
              });

              this.dialogRef.close();
            } else {
              this.lblmonto = dblPedTot.toFixed(2);
              this.lblMontoTotal = parseFloat(pedido.MontoTotal).toFixed(2);
              this.lblMontoImpuesto = parseFloat(pedido.Impuesto).toFixed(2);
            }
          } else {
            Swal.fire({
              title: this.texts.get('validation'),
              text: this.texts.get('totalTimeout'),
              icon: 'warning',
              confirmButtonText: this.texts.get('accept')
            });
            this.dialogRef.close();
          }
        },
        (error: any) => {
          console.error('Error:', error);
          Swal.fire({
            title: this.texts.get('validation'),
            text: error,
            icon: 'error',
            confirmButtonText: this.texts.get('accept')
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
          Swal.fire({
            title: this.texts.get('system'),
            text: this.texts.get('registerInfoNotFound'),
            icon: 'warning',
            confirmButtonText: this.texts.get('accept')
          });
          this.dialogRef.close();
          return;
        }

        const tipo = this.listTipoDocumento.find(z => z.IdTipoDocumento === this.tipoDocumento?.IdTipoDocumento);
        if (!tipo) {
          Swal.fire({
            title: this.texts.get('system'),
            text: this.texts.get('selectedDocumentTypeNotFound'),
            icon: 'warning',
            confirmButtonText: this.texts.get('accept')
          });
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
        Swal.fire({
          title: this.texts.get('error'),
          text: error?.message ?? this.texts.get('getRegisterError'),
          icon: 'error',
          confirmButtonText: this.texts.get('accept')
        });
        this.dialogRef.close();
      }
    });

  }

  private async initializeTipoDocCliente(): Promise<void> {
    try {
      const response = await this.tipoDocClienteService.getTipoDocClientes().toPromise();
      const allTipoDocumentoCliente = response.Data ?? [];

      // Para tipos con cliente opcional (Boleta, FS, Express): precargar la lista
      // pero NO rellenar datos del cliente (el bloque está oculto por defecto).
      if (this.clienteOpcional && !this.mostrarDatosCliente) {
        this.listTipoDocumentoCliente = allTipoDocumentoCliente;
        return;
      }

      const isBoletaVenta       = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta;
      const isExpress           = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.Express;
      const isFactSimplificada  = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaSimplificada;
      const isBoletaManual      = this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaManual;
      const esSimplificada = isBoletaVenta || isExpress || isFactSimplificada || isBoletaManual;

      // Boleta/Express → todos los tipos de identidad
      // Factura → solo los que RequiereParaFactura === true
      this.listTipoDocumentoCliente = esSimplificada
        ? allTipoDocumentoCliente
        : allTipoDocumentoCliente.filter(doc => doc.RequiereParaFactura === true);

      // Selección por defecto: DNI para boleta, primer RequiereParaFactura para factura
      this.cliente.TipoIdentidad = esSimplificada
        ? (allTipoDocumentoCliente.find(doc => doc.IdTipoIdentidad === EnumTipoIdentidad.DNI)
            ?? allTipoDocumentoCliente[0]
            ?? null)
        : (this.listTipoDocumentoCliente[0] ?? null);

      this.etiquetaCliente = this.cliente.TipoIdentidad?.IdTipoIdentidad ?? '';

      let ruc = '';
      let razonSocial = '';
      if (esSimplificada) {
        ruc = '00000001';
        razonSocial = 'Cliente Varios';
      }

      const clienteFormGroup = this.form.get('cliente') as FormGroup;
      clienteFormGroup.patchValue({
        tipoIdentidad: this.cliente.TipoIdentidad?.IdTipoIdentidad ?? null,
        ruc,
        razonSocial
      });

      // optional chaining para evitar crash si TipoIdentidad es null
      this.cliente.IdTipoIdentidad = this.cliente.TipoIdentidad?.IdTipoIdentidad ?? '';

      // Aplicar el validador basado en regex ahora que la lista está cargada.
      // (La suscripción a valueChanges se registra después de ngOnInit, así que
      //  aquí lo llamamos manualmente por primera vez.)
      this.updateRucValidator();

    } catch (error) {
      console.error('Error al inicializar el tipo de documento del cliente:', error);
    }
  }


  /**
   * Ajusta los validators del bloque cliente según `mostrarDatosCliente`.
   * Para FacturaSimplificada ES: cuando el monto < 400 y el cliente no pide datos,
   * los campos del cliente son opcionales y se limpian.
   */
  actualizarValidadoresCliente(): void {
    const clienteGrp = this.form.get('cliente') as FormGroup;
    if (this.mostrarDatosCliente) {
      clienteGrp.get('tipoIdentidad')?.setValidators([Validators.required]);
      clienteGrp.get('ruc')?.setValidators([Validators.required]);
      clienteGrp.get('razonSocial')?.setValidators([Validators.required, this.razonSocialValidator()]);
    } else {
      clienteGrp.get('tipoIdentidad')?.clearValidators();
      clienteGrp.get('ruc')?.clearValidators();
      clienteGrp.get('razonSocial')?.clearValidators();
      clienteGrp.patchValue({ ruc: '', razonSocial: '' });
    }
    clienteGrp.get('tipoIdentidad')?.updateValueAndValidity();
    clienteGrp.get('ruc')?.updateValueAndValidity();
    clienteGrp.get('razonSocial')?.updateValueAndValidity();
  }

  /** El cajero activa manualmente los datos del cliente en FacturaSimplificada ES */
  toggleClienteDatos(): void {
    this.clienteSolicitaDatos = true;
    this.mostrarDatosCliente = true;
    // Abrir vacío — sin valores por defecto
    const clienteGrp = this.form.get('cliente') as FormGroup;
    clienteGrp.patchValue({ tipoIdentidad: null, ruc: '', razonSocial: '', direccion: '', correo: '' });
    this.etiquetaCliente = '';
    this.actualizarValidadoresCliente();
    this.updateRucValidator();
  }

  /** El cajero decide no incluir datos del cliente (Boleta, FS, Express) */
  ocultarClienteDatos(): void {
    this.clienteSolicitaDatos = false;
    this.mostrarDatosCliente = false;
    // Limpiar campos
    const clienteGrp = this.form.get('cliente') as FormGroup;
    clienteGrp.patchValue({ tipoIdentidad: null, ruc: '', razonSocial: '', direccion: '', correo: '' });
    this.actualizarValidadoresCliente();
  }

  private async initializeTipoDocumento(): Promise<void> {
    var response = await this.cajaTipoDocumentoService.GetTiposDocumentos(this.idCaja).toPromise();
    let allTipoDocumento = response;
    if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.BoletaManual || doc.IdTipoDocumento === EnumTipoDocumento.BoletaVenta);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.BoletaVenta;
      this.clienteOpcional = true;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaVenta) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.FacturaManual || doc.IdTipoDocumento === EnumTipoDocumento.FacturaVenta);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.FacturaVenta;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaSimplificada) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.FacturaSimplificada);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.FacturaSimplificada;
      this.clienteOpcional = true;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.Express) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.Express);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.Express;
      this.clienteOpcional = true;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaManual) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.BoletaManual);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.BoletaManual;
      this.clienteOpcional = true;
    } else if (this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.FacturaManual) {
      this.listTipoDocumento = allTipoDocumento.filter(doc => doc.IdTipoDocumento === EnumTipoDocumento.FacturaManual);
      this.tipoDocumento.IdTipoDocumento = EnumTipoDocumento.FacturaManual;
    }

    // Para tipos con cliente opcional: ocultar bloque por defecto
    if (this.clienteOpcional) {
      this.clienteSolicitaDatos = false;
      this.mostrarDatosCliente = false;
      this.actualizarValidadoresCliente();
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
          Swal.fire(
            this.texts.get('validation'),
            this.texts.get('cardAmountExceedsTotal'),
            'info'
          );
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
        Swal.fire(
          this.texts.get('validation'),
          this.texts.get('enterCardPaymentAmount'),
          'warning'
        );
        // Focus on txtmontarjeta
      }
    } catch (ex) {
      Swal.fire(this.texts.get('error'), ex.message, 'warning');
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
    const titulo =
      this.monedaPrincipal?.Descripcion ?? this.texts.get('mainCurrency');
    this.ComponenteCantidad(titulo).then(valor => {
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
    const titulo = this.monedaAlternativa?.Descripcion ?? 'Moneda alternativa';
    this.ComponenteCantidad(titulo).then(valor => {
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

      // ── Calcular si el backend usará cliente genérico ────────────────
      const E = EnumTipoDocumento;
      const tipoDoc = this.tipoDocumento.IdTipoDocumento;
      const esFacturaObligatoria = tipoDoc === E.FacturaVenta || tipoDoc === E.FacturaManual;
      const rucForm: string = this.form.get('cliente.ruc')?.value ?? '';
      const usarClienteGenerico = esFacturaObligatoria
        ? false
        : !this.mostrarDatosCliente || !rucForm || rucForm === '00000001';

      // ── Si se usa cliente genérico: no se necesitan datos del cliente ─
      if (usarClienteGenerico) {
        this.cobrar(false);
        return;
      }

      // ── Sincronizar cliente desde el formulario ──────────────────────
      const tipoIdentidadId: string = this.form.get('cliente.tipoIdentidad')?.value;
      const tipoIdentidadCompleto = this.listTipoDocumentoCliente.find(
        t => t.IdTipoIdentidad === tipoIdentidadId
      ) ?? new TipoIdentidad({
        IdTipoIdentidad: tipoIdentidadId,
        Descripcion: tipoIdentidadId,
        Abreviatura: tipoIdentidadId,
      });

      this.cliente.TipoIdentidad       = tipoIdentidadCompleto;
      this.cliente.IdTipoIdentidad      = tipoIdentidadId;
      this.cliente.NumeroIdentificacion = rucForm;
      this.cliente.RazonSocial          = this.form.get('cliente.razonSocial')?.value;
      this.cliente.Direccion            = this.form.get('cliente.direccion')?.value;
      this.cliente.Email               = this.form.get('cliente.correo')?.value;

      // ── Validar campos obligatorios del cliente ──────────────────────
      if (!tipoIdentidadId) {
        Swal.fire(
          this.texts.get('validation'),
          this.texts.get('selectCustomerIdentityType'),
          'warning'
        );
        return;
      }
      if (!rucForm) {
        Swal.fire(
          this.texts.get('validation'),
          this.texts.get('enterCustomerIdentityNumber'),
          'warning'
        );
        return;
      }
      if (!this.cliente.RazonSocial) {
        Swal.fire(
          this.texts.get('validation'),
          this.texts.get('enterCustomerBusinessName'),
          'warning'
        );
        return;
      }

      // ── Validación de formato via regex del backend ──────────────────
      const tipoIdentidadObj = this.listTipoDocumentoCliente.find(
        t => t.IdTipoIdentidad === this.cliente.TipoIdentidad.IdTipoIdentidad
      ) ?? null;

      const formatError = this.validarNumeroIdentificacion(this.cliente.NumeroIdentificacion, tipoIdentidadObj);
      if (formatError) {
        Swal.fire(this.texts.get('validation'), formatError, 'warning');
        return;
      }

      // ── Validaciones de negocio ──────────────────────────────────────
      if (tipoDoc === E.FacturaVenta) {
        if (!this.cliente.NumeroIdentificacion || this.cliente.NumeroIdentificacion === '99999999999') {
          Swal.fire(
            this.texts.get('validation'),
            this.texts.get('enterValidCustomerIdentity'),
            'warning'
          );
          return;
        }
        if (!this.cliente.Direccion) {
          Swal.fire(
            this.texts.get('validation'),
            this.texts.get('enterCustomerAddress'),
            'warning'
          );
          return;
        }
      } else {
        // Regla "Cliente Varios" / "00000001" solo aplica para DNI en Boleta
        if (this.cliente.TipoIdentidad.IdTipoIdentidad === EnumTipoIdentidad.DNI) {
          if (this.cliente.NumeroIdentificacion === '00000001' && this.cliente.RazonSocial !== 'Cliente Varios') {
            Swal.fire(
              this.texts.get('validation'),
              this.texts.get('genericIdentityNameRule'),
              'warning'
            );
            return;
          }
          if (this.cliente.NumeroIdentificacion !== '00000001' && this.cliente.RazonSocial === 'Cliente Varios') {
            Swal.fire(
              this.texts.get('validation'),
              this.texts.get('genericCustomerIdentityRule'),
              'warning'
            );
            return;
          }
        }
        // Monto ≥ 700: no permitir "00000001" en Boleta
        if (parseFloat(this.lblmonto) >= 700 && (tipoDoc === E.BoletaVenta || tipoDoc === E.BoletaManual)) {
          if (this.cliente.NumeroIdentificacion === '00000001') {
            Swal.fire(
              this.texts.get('validation'),
              this.texts.get('amountRequiresCustomerIdentity'),
              'warning'
            );
            return;
          }
        }
      }

      if (this.cliente.Email && !this.isValidEmail(this.cliente.Email)) {
        Swal.fire(
          this.texts.get('validation'),
          this.texts.get('invalidCustomerEmail'),
          'warning'
        );
        return;
      }

      this.cobrar(false);
    } catch (error) {
      Swal.fire(this.texts.get('error'), error.message, 'error');
    }
  }

  isValidEmail(email: string): boolean {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{2,})$/i;
    return re.test(String(email).toLowerCase());
  }

  cobrar(alCredito: boolean): void {
    let mensaje = this.texts.get('confirmChargeAccount');
    if (this.ChkVentaAlCredito) {
      mensaje = this.texts.get('confirmCreditSale');
    }

    if (!((this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaVenta || this.tipoDocumento.IdTipoDocumento === EnumTipoDocumento.BoletaManual) && this.storageService.getCurrentSession().boletaRapida)) {
      Swal.fire({
        title: mensaje,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: this.texts.get('yes'),
        cancelButtonText: this.texts.get('no')
      }).then((result) => {
        if (result.isConfirmed) {
          this.procesarCobro(alCredito);
        }
      });
    } else {
      if (parseFloat(this.lbltotal) >= parseFloat(this.lblmonto)) {
        this.procesarCobro(alCredito);
      } else {
        Swal.fire(
          this.texts.get('message'),
          this.texts.get('paymentBelowTotal'),
          'warning'
        );
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

  /**
   * Imprime sin retener el cierre del dialogo y avisa si algun documento no ha
   * salido: una venta emitida sin comprobante no puede pasar desapercibida.
   */
  private async imprimirYAvisarSiFalla(
    listImpresionDTO: ImpresionDTO[],
  ): Promise<void> {
    const impresos = await this.imprimir(listImpresionDTO);
    if (impresos >= listImpresionDTO.length) return;

    // Refresca el aviso de la caja: si se ha llegado aqui, la impresion directa
    // ha dejado de funcionar en esta estacion.
    void this.estadoImpresion.comprobar(true);

    Swal.fire({
      icon: 'warning',
      title: 'El comprobante no ha salido todavía',
      text: 'La venta se emitió correctamente. El documento queda en espera y se '
        + 'imprimirá solo en cuanto la impresora responda; si no, puedes '
        + 'reimprimirlo desde Documentos emitidos.',
    });
  }


  async procesarCobro(alCredito: boolean): Promise<void> {
    if (!this.ChkVentaAlCredito && parseFloat(this.lbltotal) < parseFloat(this.lblmonto)) {
      Swal.fire(
        this.texts.get('message'),
        this.texts.get('paymentBelowTotal'),
        'warning'
      );
      return;
    }
    const listaImpresionDTO: ImpresionDTO[] = await this.grabarDocumento();
    if (listaImpresionDTO) {
      if (this.idTipoPedido === '005') {

        Swal.fire({
          title: this.texts.get('preferredFormat'),
          text: this.texts.get('chooseOption'),
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'A4',
          cancelButtonText: this.texts.get('ticket')
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
        void this.imprimirYAvisarSiFalla(listaImpresionDTO);
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
        IdTipoPago: TipoPagoEnum.Efectivo,
        IdMoneda: this.monedaPrincipal?.IdMoneda ?? '',
        MontoPagado: this.solesValue,
        MontoRecibido: this.solesValue,
        TipoCambio: 1,
        MontoVenta: parseFloat(this.lblmonto),
        Propina: 0,
        Vuelto: parseFloat(this.lblvuelto),
        IdTarjeta : null,
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
        IdTipoPago: TipoPagoEnum.Efectivo,
        IdMoneda: this.monedaAlternativa?.IdMoneda ?? '',
        MontoPagado: parseFloat(this.lblcal),
        MontoRecibido: this.dolaresValue,
        TipoCambio: parseFloat(this.lblcambio),
        MontoVenta: parseFloat(this.lblmonto),
        Propina: 0,
        Vuelto: Vuelto,
        IdTarjeta : null,
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
        IdTipoPago: TipoPagoEnum.Tarjeta,
        IdMoneda: this.monedaPrincipal?.IdMoneda ?? '',
        MontoPagado: row.MontoPagado,
        MontoRecibido: row.MontoPagado,
        TipoCambio: 1,
        MontoVenta: parseFloat(this.lblmonto),
        Propina: row.Propina,
        Vuelto: 0,
        IdTarjeta : row.Tarjeta.IdTarjeta,
        Tarjeta: new Tarjeta({ IdTarjeta: row.Tarjeta.IdTarjeta, Descripcion: row.Tarjeta.Descripcion }),
        Autorizacion: row.Autorizacion,
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        Estado: 1,
        IdTurno: this.idTurno
      };
      listPago.push(pagoTable);
    });



    // Determinar si el backend debe usar el cliente genérico
    const E = EnumTipoDocumento;
    const tipoDoc = this.tipoDocumento.IdTipoDocumento;
    const esFacturaObligatoria = tipoDoc === E.FacturaVenta || tipoDoc === E.FacturaManual;
    const usarClienteGenerico = esFacturaObligatoria
      ? false
      : !this.mostrarDatosCliente
        || !this.cliente.NumeroIdentificacion
        || this.cliente.NumeroIdentificacion === '00000001';

    var resultGenerateComprobante: ApiResponse<ImpresionDTO[]> = await this.ventaService.guardarDocumentoVenta(
      this.idTipoPedido, venta, this.cliente, this.pedidoCab,
      this.listaDescuentoCodigo, listPago, this.bTurnoIndenpendiente,
      usarClienteGenerico
    ).toPromise();
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

    // Leer siempre desde el form para no depender del estado desincronizado de this.cliente
    const tipoIdentidadId: string = this.form.get('cliente.tipoIdentidad')?.value;
    const tipoIdentidadObj = this.listTipoDocumentoCliente.find(
      t => t.IdTipoIdentidad === tipoIdentidadId
    ) ?? null;

    // Sincronizar para que la API de búsqueda use el tipo correcto
    if (tipoIdentidadObj) {
      this.cliente.TipoIdentidad  = tipoIdentidadObj;
      this.cliente.IdTipoIdentidad = tipoIdentidadId;
    }

    const formatError = this.validarNumeroIdentificacion(ruc, tipoIdentidadObj);
    if (formatError) {
      Swal.fire({
        title: this.texts.get('validation'),
        text: formatError,
        icon: 'warning',
        confirmButtonText: this.texts.get('accept')
      });
      return;
    }

    // "00000001" = Cliente Varios genérico, no hay nada que buscar
    if (tipoIdentidadId === EnumTipoIdentidad.DNI && ruc === '00000001') {
      return;
    }

    this.clienteService.buscarPorIdentidad(ruc, this.cliente.TipoIdentidad.IdTipoIdentidad).subscribe(
      (clienteBuscar: any) => {
        if (clienteBuscar) {
          if (clienteBuscar.RazonSocial) {
            const clienteFormGroup = this.form.get('cliente') as FormGroup;
            clienteFormGroup.patchValue({
              ruc: clienteBuscar.NumeroIdentificacion,
              razonSocial: clienteBuscar.RazonSocial,
              direccion: clienteBuscar.Direccion,
              correo: clienteBuscar.Email
            });


          } else {
            Swal.fire({
              title: this.texts.get('validation'),
              text: this.texts.get('customerNotFound'),
              icon: 'warning',
              confirmButtonText: this.texts.get('accept')
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
            title: this.texts.get('validation'),
            text: this.texts.get('customerNotFound'),
            icon: 'warning',
            confirmButtonText: this.texts.get('accept')
          });
        }
      },
      (error: any) => {
        console.error('Error:', error);
        Swal.fire({
          title: this.texts.get('validation'),
          text: error,
          icon: 'error',
          confirmButtonText: this.texts.get('accept')
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
        this.faltaPago = true;
        this.lblvuelto = Math.abs(total - montoLbl).toFixed(2);
      } else {
        this.faltaPago = false;
        this.lblvuelto = (total - montoLbl).toFixed(2);
      }
    } catch (error) {
      Swal.fire({
        title: this.texts.get('error'),
        text: `${error ?? ''} ${this.texts.get('amountCalculationError')}`.trim(),
        icon: 'error',
        confirmButtonText: this.texts.get('accept')
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
      this.faltaPago = true;
      this.lblvuelto = (Math.abs(difference)).toFixed(2);
    } else {
      this.faltaPago = false;
      this.lblvuelto = difference.toFixed(2);
    }
  }

  isNumeric(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }

  /** true cuando el pago acumulado cubre el monto a cobrar. */
  get pagoCompleto(): boolean {
    const monto = parseFloat(this.lblmonto) || 0;
    return monto > 0 && parseFloat(this.lbltotal) >= monto;
  }

  /** Porcentaje del monto total cubierto (0–100, sin exceder 100). */
  getProgresoPago(): number {
    const monto = parseFloat(this.lblmonto) || 0;
    if (monto === 0) return 0;
    const total = parseFloat(this.lbltotal) || 0;
    return Math.min((total / monto) * 100, 100);
  }

}
