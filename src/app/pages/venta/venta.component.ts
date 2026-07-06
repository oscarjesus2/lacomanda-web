import { Component, OnInit, ViewChild, inject, HostListener, AfterViewInit, ElementRef, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';


import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';

//Components
import { DialogVerPedidoComponent } from '../../components/dialog-ver-pedido/dialog-ver-pedido.component';
import { DialogObservacionComponent } from '../../components/dialog-observacion/dialog-observacion.component';


//Models
import { Producto } from '../../models/product.models';
import { Ambiente } from '../../models/ambiente.models';
import { Espacios } from '../../models/espacios.models';
import { ProductGrid } from '../../models/product.grid.models';
import { Empleado } from '../../models/empleado.models';
import { PedidoDet } from '../../models/pedidodet.models';
import { Observacion } from '../../models/observacion.models';
import { PedidoCab } from '../../models/pedido.models';
import { Familia } from '../../models/familia.models';
import { SubFamilia } from '../../models/subfamilia.models';
import { Usuario } from '../../models/usuario.models';

// Servicios
import { StorageService } from '../../services/storage.service';
import { ProductoService } from '../../services/product.service';
import { EspaciosService } from '../../services/espacios.service';
import { FamiliaService } from '../../services/familia.service';
import { AmbienteService } from '../../services/ambiente.service';
import { ObservacionService } from '../../services/observacion.service';
import { PedidoService } from '../../services/pedido.service';
import { TurnoService } from '../../services/turno.service';
import { EmpleadoService } from '../../services/empleado.service';
import { SocioNegocioService } from '../../services/socionegocio.service';
import { Turno } from 'src/app/models/turno.models';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogEmitirComprobanteComponent } from 'src/app/components/dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { HeaderService } from 'src/app/services/header.service';
import { faFileInvoiceDollar, faFileInvoice, faPercentage, faFileAlt, faChartPie } from '@fortawesome/free-solid-svg-icons';
import { faUtensils, faShoppingBag, faTruck, faSync, faConciergeBell, faEye, faList, faPaperPlane, faReceipt, faTimes, faLock, faRunning, faWalking , faL } from '@fortawesome/free-solid-svg-icons';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { PedidoEspacioDTO } from 'src/app/interfaces/pedidoespacioDTO.interface';
import { DialogMCantComponent } from 'src/app/components/dialog-mcant/dialog-mcant.component';
import { DialogComplementosComponent } from 'src/app/components/dialog-complementos/dialog-complementos.component';
import { PedidoComplemento } from 'src/app/models/pedidocomplemento.models';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
// import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { forkJoin, lastValueFrom } from 'rxjs';
import { UsuarioService } from 'src/app/services/usuario.service';
import { DialogMTextComponent } from 'src/app/components/dialog-mtext/dialog-mtext.component';
import { AnularProductoYComplementoDTO } from 'src/app/interfaces/anularProductoYComplementoDTO.interface';
import { DialogProductSearchComponent } from 'src/app/components/dialog-product-search/dialog-product-search.component';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { PedidoDeliveryDTO } from 'src/app/interfaces/pedidoDTO.interface';
import { SocioNegocio } from 'src/app/models/socionegocio.models';
import { Cliente } from 'src/app/models/cliente.models';
import { DialogDividirCuentaComponent } from 'src/app/components/dialog-dividir-cuenta/dialog-dividir-cuenta.component';
import { DialogReportesComponent } from 'src/app/components/dialog-reportes/dialog-reportes.component';
import { EnumTipoDocumento, NivelUsuarioEnum } from 'src/app/enums/enum';
import { DialogDescuentoComponent } from 'src/app/components/dialog-descuento/dialog-descuento.component';
import { PedidoDescuentoDTO } from 'src/app/interfaces/pedidoDescuentoDTO.interface';
import { TrasladarProductoDTO } from 'src/app/interfaces/trasladarProductoDTO.interface';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { Configuracion } from 'src/app/models/configuracion.models';
import { CanalVentaService } from 'src/app/services/canal-venta.service';
import { CanalVenta } from 'src/app/models/canalventa.models';
import { CajaService } from 'src/app/services/caja.service';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import { DialogEntradasComponent } from 'src/app/components/dialog-entradas/dialog-entradas.component';
import { DialogDocumentosEmitidosComponent } from 'src/app/components/dialog-documentos-emitidos/dialog-documentos-emitidos.component';
import { CanalVentaEnum } from 'src/app/enums/enum';

@Component({
  selector: 'app-venta',
  templateUrl: './venta.component.html',
  styleUrls: ['./venta.component.css']
})

export class VentaComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  isEdited: boolean;
  elementArr: any = [].fill(0);
  public turnoAbierto: Turno;
  public user: Usuario;
  public config: Configuracion | null = null;
  public displayedColumns: string[] = ['NombreProducto', 'Precio', 'Cantidad', 'actions'];
  public ListaProductosdisplayedColumns: string[] = ['icoObs', 'nombrecorto', 'precio', 'add', 'cantidad', 'remove', 'actions'];
  public DEFAULT_ID = 0;
  public listProducts: Producto[];
  public listProductoVenta: Producto[];
  public listProducts_x_SubFamilia: Producto[];
  public listAmbiente: Ambiente[];
  public listFamilia: Familia[];
  public listSubFamilia: SubFamilia[];
  public listSubFamilia_x_Familia: SubFamilia[];
  public selectedValue: string;
  public displayValueAmbiente: string;
  public selectedValueDos: string;
  public listaEspaciosTotal: Espacios[];
  public listaEspacios_x_Ambiente: Espacios[];
  public listaTipoPedidos: CanalVenta[];
  public listaPedidosPendientes: PedidoDeliveryDTO[] = [];
  public listaPedido_x_Canal: PedidoDeliveryDTO[];

  public listEmpleados: Empleado[];
  public listObservacion: Observacion[];
  public oTurno: Turno;
  public StyleCustom: string = "height: 90%";
  public IdSubFamila: number;
  public idPedidoCobrar: number = 0;
  public nroCuentaCobrar: number = 0;

  public numeroPedido: string = "";
  public horaPedido: string = "";
  public userLoged: any = { id: "", username: "" };

  public listProductGrid: PedidoDet[] = [];
  public gridListaPedidoDetProducto = new MatTableDataSource<PedidoDet>();
  // public ListaPedidoDetProducto: PedidoDet[] = [];

  public MostrarOcultarPanelProducto: Boolean;
  public MostrarOcultarPanelEspacio: Boolean;
  public MostrarOcultarPanelPedido: Boolean;
  public mozoSelected: Empleado | undefined;
  public clienteSelected: Cliente;
  public socioNegocioSelected: SocioNegocio;
  public espacioSelected: Espacios;

  public RehacerPantallaRefresh: string = "";
  selectedItemFamilia: any = null;
  selectedItemSubFamilia: any = null;

  aplicarFiltroCambioEspacio: boolean = false;
  aplicarFiltroUnirEspacio: boolean = false;
  aplicarFiltroTrasladoProducto: boolean = false;
  aplicarFiltroTrasladarAEspacio: boolean = false;
  productoParaTraslado: PedidoDet | null = null;
  ambienteActual: Ambiente | null = null;
  textDescuento: string ='Descuento';
  isBuscarProductoDisabled= false;
  isEntrada    = false;
  isEspacio    = false;  // ocultos hasta que se cargue la configuración de la caja
  isParaLlevar = false;
  isDelivery   = false;
  isCanalVentaDisabled = false;
  isPanelProductoDisabled = false;
  isComboDisabled = false;
  isVerComplementoDisabled = false;
  isPriorizarDespachoDisabled = false;
  isEnviarPedidoDisabled = false;

  isAnularPedidoDisabled = false;
  isPrecuentaDisabled    = false;

  /** true cuando la ruta activa es /mozo; false en /caja */
  isModoMozo = false;
  isReImprimirDisabled = false;
  isBloquearDisabled = false;
  selectedRow: PedidoDet;
  isAdmin = false;
  listaSociosNegocio: SocioNegocio[];
  public canalVentaEnum = CanalVentaEnum;
  idCanalVentaSelected: number = this.canalVentaEnum.ESPACIO;
  idCanalVentaDefectoCaja: number = 0;  // canal por defecto configurado en la caja activa

  @ViewChild(MatPaginator) paginator: MatPaginator;
  procesarPedido: boolean = false;
  nombreCuenta: string = '';
  idEmpleadoLlevar : number = 0;
  constructor(
    private router: Router,
    private storageService: StorageService,
    private productService: ProductoService,
    private TurnoService: TurnoService,
    private ambienteService: AmbienteService,
    private espaciosService: EspaciosService,
    private empleadoService: EmpleadoService,
    private observacionService: ObservacionService,
    private socioNegocioService: SocioNegocioService,
    private pedidoService: PedidoService,
    private tipoPedidoService: CanalVentaService,
    private cajaService: CajaService,
    private dialogEspacio: MatDialog,
    private dialogComprobante: MatDialog,
    private dialog: MatDialog,
    private spinnerService: NgxSpinnerService,
    private qzTrayService: QzTrayV224Service,
    private familiaService: FamiliaService,
    private headerService: HeaderService,
    private usuarioService: UsuarioService,
    private configuracionService: ConfiguracionService,
    private activatedRoute: ActivatedRoute) {


    this.MostrarOcultarPanelEspacio = true;
    this.MostrarOcultarPanelProducto = false;
    this.mozoSelected = new Empleado;
    this.clienteSelected = new Cliente;
    this.socioNegocioSelected = new SocioNegocio;
    this.espacioSelected = new Espacios;
    this.MostrarOcultarPanelPedido = false;
    this.RehacerPantallaRefresh = 'Refresh';

    const user = this.storageService.getCurrentUser?.();
    this.isAdmin = !!user && user.IdNivel === 1;
    this.isModoMozo = this.router.url.startsWith('/mozo');
    console.log(user)
  }

  TipoDocumento = EnumTipoDocumento;
  sumaTotal: number = 0;

  // Botones Factura / Boleta — controlados por tipos de documento configurados en la caja
  mostrarFactura  = false;
  mostrarBoleta   = false;
  textoFactura    = 'Factura';
  textoBoleta     = 'Boleta';
  idTipoDocFactura: EnumTipoDocumento = EnumTipoDocumento.FacturaVenta;
  idTipoDocBoleta:  EnumTipoDocumento = EnumTipoDocumento.BoletaVenta;
  sumaDscto: number = 0;
  sumaImporte: number = 0;
  sumaImpuestoBolsa: number = 0;
  sumaGranTotal: number = 0;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faFileInvoice = faFileInvoice;
  faPercentage = faPercentage;
  faFileAlt = faFileAlt;
  faChartPie = faChartPie;
  faUtensils = faUtensils;
  faShoppingBag = faShoppingBag;
  faTruck = faTruck;
  faWalking = faWalking;
  faSync = faSync;
  faConciergeBell = faConciergeBell;
  faEye = faEye;
  faList = faList;
  faPaperPlane = faPaperPlane;
  faReceipt = faReceipt;
  faTimes = faTimes;
  faLock = faLock;
  faRunning = faRunning;
  espacios: { name: string; active: boolean; price: number, indice: number }[] = [];

  toggleBloquear() {
    if (!this.procesarPedido) {
      this.salir(); // Llamar a la función salir si está visible el botón Bloquear
    } else {
      this.RehacerPantalla(); // Llamar a la función Rehacer si está visible el botón Rehacer
    }
  }

  
  goAdmin() {
    this.router.navigateByUrl('/administracion');
  }

  // Atajo de teclado: Ctrl + Alt + A
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (this.isAdmin && e.ctrlKey && e.altKey && (e.key.toLowerCase() === 'a')) {
      e.preventDefault();
      this.goAdmin();
    }
  }

  ngOnDestroy() {
    this.headerService.showHeader(); // Mostrar el header al salir
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullScreenChange(event: Event) {
    console.log('Fullscreen status changed');
  }

  private shouldScroll: boolean = false;

  ngAfterViewInit() {
    this.scrollToBottom(); // Intentamos hacer scroll cuando la vista se carga

  }

  ngAfterViewChecked() {
    // Solo hacemos scroll si los datos han cambiado o es necesario
    if (this.shouldScroll) {
      setTimeout(() => {
        this.scrollToBottom();
        this.selectLastRow();
        this.shouldScroll = false;
      });
    }
  }

  /** Calcula visibilidad y texto de los botones Factura y Boleta */
  calcularBotonesDocumento(docs: CajaTipoDocumento[]): void {
    const E = EnumTipoDocumento;

    // ── FACTURA ──────────────────────────────────────────────────
    const docFactura = docs.find(d => d.IdTipoDocumento === E.FacturaVenta)
                    ?? docs.find(d => d.IdTipoDocumento === E.FacturaManual);
    this.mostrarFactura  = !!docFactura;
    this.textoFactura    = docFactura?.Descripcion ?? 'Factura';
    this.idTipoDocFactura = docFactura?.IdTipoDocumento as EnumTipoDocumento ?? E.FacturaVenta;

    // ── BOLETA ───────────────────────────────────────────────────
    // Prioridad: BoletaVenta(2) → FacturaSimplificada(5) → BoletaManual(8)
    const docBoleta = docs.find(d => d.IdTipoDocumento === E.BoletaVenta)
                   ?? docs.find(d => d.IdTipoDocumento === E.FacturaSimplificada)
                   ?? docs.find(d => d.IdTipoDocumento === E.BoletaManual);
    this.mostrarBoleta  = !!docBoleta;
    this.textoBoleta    = docBoleta?.Descripcion ?? 'Boleta';
    this.idTipoDocBoleta = docBoleta?.IdTipoDocumento as EnumTipoDocumento ?? E.BoletaVenta;
  }

  /** Actualiza los flags de visibilidad de cada botón de canal según lo configurado en la caja */
  actualizarFlagsCanales(): void {
    const ids = this.listaTipoPedidos.map(c => c.IdCanalVenta);
    // Si viene vacío (sin configuración) mostramos todos
    if (ids.length === 0) {
      this.isEspacio = this.isParaLlevar = this.isDelivery = true;
      this.isEntrada = false;
      return;
    }
    this.isEspacio    = ids.includes(this.canalVentaEnum.ESPACIO);
    this.isParaLlevar = ids.includes(this.canalVentaEnum.PARA_LLEVAR);
    this.isDelivery   = ids.includes(this.canalVentaEnum.DELIVERY);
    this.isEntrada    = ids.includes(this.canalVentaEnum.ENTRADAS);

    // Si el canal activo no está habilitado para esta caja, activar el canal por defecto
    if (!ids.includes(this.idCanalVentaSelected) && this.listaTipoPedidos.length > 0) {
      const defecto = ids.includes(this.idCanalVentaDefectoCaja)
        ? this.idCanalVentaDefectoCaja
        : this.listaTipoPedidos[0].IdCanalVenta;   // fallback: primero disponible
      this.canalVenta(defecto);
    }
  }

  canalVenta(idCanalVenta: number): void {
    this.limpiarPedido();
    this.idCanalVentaSelected = idCanalVenta;
    if (idCanalVenta === this.canalVentaEnum.ENTRADAS) {
      this.abrirEntradas();
    } else {
      this.listaPedido_x_Canal = this.listaPedidosPendientes.filter(x => x.Estado === 1 && x.IdCanalVenta === idCanalVenta);
    }
  }

  scrollToBottom(): void {
    try {
      setTimeout(() => {
        const container = this.scrollContainer.nativeElement;

        // Verificamos si el scrollHeight es mayor que el clientHeight para permitir el scroll
        if (container.scrollHeight > container.clientHeight) {
          container.scrollTop = container.scrollHeight; // Desplazamos el scroll al final
        }
      }, 100); // Esperamos 100 ms para asegurarnos de que el contenido esté renderizado
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  selectLastRow(): void {
    // Verifica si hay datos en la tabla
    if (this.gridListaPedidoDetProducto.data.length > 0) {
      this.selectedRow = this.gridListaPedidoDetProducto.data[this.gridListaPedidoDetProducto.data.length - 1]; // Seleccionamos la última fila
    }
  }

  selectRow(row: any) {
    this.selectedRow = row; // Asigna la fila seleccionada a la propiedad
  }

  enterFullScreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else {
      console.warn("Pantalla completa no es soportada por este navegador.");
    }
  }

  async ngOnInit() {
    this.configuracionService.get().subscribe(cfg => this.config = cfg);

    this.enterFullScreen();
    const isRunning = await this.qzTrayService.isQzTrayRunning();
    if (!isRunning) {
      this.router.navigate(['/qz-tray-required']);
      return;
    } 
    this.spinnerService.show();
    this.headerService.hideHeader();

    try {
      console.log("antes");
      this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
        if (data?.Data != null) {
          this.turnoAbierto = data.Data;

          // Aquí se ejecutan los demás servicios en paralelo una vez que se ha obtenido el turno abierto
          forkJoin({
            listProductoVenta: this.productService.getProductosParaVenta(this.storageService.getCurrentIP()),
            listProductosTablero: this.productService.getAllProductosTablero(),
            listaEspaciosTotal: this.espaciosService.GetAllEspaciosConPedidos(),
            responsePedidos: this.pedidoService.ObtenerPedidosByIdTurno(this.turnoAbierto.IdTurno),
            responseEmpleados: this.empleadoService.getAllEmpleados(),
            listAmbiente: this.ambienteService.getAllAmbiente(),
            listFamilia: this.familiaService.getFamilias(),
            listSubFamilia: this.familiaService.getSubFamilias(),
            listObservacion: this.observacionService.getAllObservacion(),
            responseSocioNegocio: this.socioNegocioService.getSocioNegocios(),
            responseTipoPedidos: this.cajaService.getCanalesVentaByCaja(data.Data.IdCaja),
            cajaDatos: this.cajaService.getCaja(data.Data.IdCaja),
            tiposDocumentoCaja: this.cajaService.getTipoDocumentoByCaja(data.Data.IdCaja),
          }).subscribe(results => {
             console.log("despues");
            // Asignación de resultados
            this.listProductoVenta = results.listProductoVenta;
            this.listProducts = results.listProductosTablero.Data;
            this.listaEspaciosTotal = results.listaEspaciosTotal.Data;

            if (results.responsePedidos.Success) {
              this.listaPedidosPendientes = results.responsePedidos.Data;
            }

            // Guardar el canal por defecto de la caja
            this.idCanalVentaDefectoCaja = results.cajaDatos?.Data?.IdCanalVentaDefecto ?? 0;

            // Calcular visibilidad y texto de botones Factura / Boleta
            this.calcularBotonesDocumento(results.tiposDocumentoCaja);

            // Si la caja tiene canales configurados, usar esos; si no, cargar todos como fallback
            const canalesCaja = results.responseTipoPedidos;
            if (canalesCaja.length > 0) {
              this.listaTipoPedidos = canalesCaja;
              this.actualizarFlagsCanales();
            } else {
              this.tipoPedidoService.listarActivos().subscribe(todos => {
                this.listaTipoPedidos = todos;
                this.actualizarFlagsCanales();
              });
            }
        

            if (results.responseEmpleados.Success) {
              this.listEmpleados = results.responseEmpleados.Data;
            }

            this.listAmbiente = results.listAmbiente.Data;
            this.listFamilia = results.listFamilia.Data;
            this.listSubFamilia = results.listSubFamilia.Data;
            this.listObservacion = results.listObservacion.Data;

            if (results.responseSocioNegocio.Success) {
              this.listaSociosNegocio = results.responseSocioNegocio.Data;
            }

            // Seleccionar mozo
            this.mozoSelected.IdEmpleado = this.storageService.getCurrentSession().User.IdEmpleado;

            // Mostrar espacios por ambiente
            const result = this.listAmbiente.find(item => item.Estado == 1);
            if (result) this.MostrarEspacios_x_Ambiente(result);

            // Configurar usuario logueado
            this.userLoged = {
              id: this.storageService.getCurrentSession().User.IdEmpleado,
              username: this.storageService.getCurrentSession().User.NombreUsuario
            };

            // Mostrar panel de espacio
            this.MostrarOcultarPanelEspacio = true;
            console.log("aqui")
            // Ocultar spinner
            this.spinnerService.hide();
          }, error => {
            // Manejo de errores en el subscribe
            this.spinnerService.hide();
            this.salir();
          });

        } else {
          // Si no hay turno abierto
          this.spinnerService.hide();
          Swal.fire({
            icon: 'warning',
            title: 'No hay un turno abierto para esta estación.',
            text: 'El componente se cerrará.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            if (this.storageService.getCurrentUser().IdNivel == 1) {
              this.router.navigate(['/dashboard']);
            } else {
              this.storageService.logout();
            }
          });
        }
      });

    } catch (error) {
      this.spinnerService.hide();
      this.salir();
    }
  }

  public salir(): void {
    this.storageService.logout();
  }



  async MostrarEspacios_x_Ambiente(ambiente: Ambiente) {
    this.spinnerService.show();

    this.ambienteActual = ambiente;
    if (this.aplicarFiltroCambioEspacio) {
      this.listaEspacios_x_Ambiente = this.listaEspaciosTotal
        .filter(x => x.IdAmbiente === ambiente.IdAmbiente)
        .map(espacio => {
          if ([1, 3, 4].includes(espacio.Ocupado)) {
            espacio.Visible = false;
          }
          else if (espacio.Ocupado === 2) {
            espacio.Color = "White";
          }
          else if (espacio.Ocupado === 5) {
            espacio.Color = "LightCyan";
          }
          else {
            espacio.Color = "White";
          }
          return espacio;
        });
    } else if (this.aplicarFiltroUnirEspacio) {
      this.listaEspacios_x_Ambiente = this.listaEspaciosTotal
        .filter(x => x.IdAmbiente === ambiente.IdAmbiente)
        .map(espacio => {
          if ([1].includes(espacio.Ocupado) && this.espacioSelected.IdEspacio != espacio.IdEspacio) {
            espacio.Visible = true;
          }
          else {
            espacio.Visible = false;
          }
          return espacio;
        });
    } else if (this.aplicarFiltroTrasladoProducto) {
      // Mostrar todas las mesas excepto la actual; fantasmas (Numero=0) permanecen ocultas
      this.listaEspacios_x_Ambiente = this.listaEspaciosTotal
        .filter(x => x.IdAmbiente === ambiente.IdAmbiente)
        .map(espacio => {
          espacio.Visible = espacio.Numero > 0 && espacio.IdEspacio !== this.espacioSelected.IdEspacio;
          return espacio;
        });
    } else if (this.aplicarFiltroTrasladarAEspacio) {
      // Solo mesas libres (Ocupado===0); fantasmas (Numero=0) permanecen ocultas
      this.listaEspacios_x_Ambiente = this.listaEspaciosTotal
        .filter(x => x.IdAmbiente === ambiente.IdAmbiente)
        .map(espacio => {
          espacio.Visible = espacio.Numero > 0 && espacio.Ocupado === 0;
          return espacio;
        });
    } else {
      this.listaEspacios_x_Ambiente = this.listaEspaciosTotal.filter(x => x.IdAmbiente === ambiente.IdAmbiente);
    }
    this.displayValueAmbiente = ambiente.Descripcion;
    this.spinnerService.hide();
  }

  async UnirEspacio() {

    if (this.espacioSelected.IdEspacio == null) {
      Swal.fire(
        'Unir Espacio',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }
    this.aplicarFiltroUnirEspacio = true;
    this.procesarPedido = true;
    if (this.ambienteActual) {
      await this.MostrarEspacios_x_Ambiente(this.ambienteActual);
    }
    this.RehacerPantallaRefresh === 'RehacerPantalla';
  }

  /** true cuando hay una mesa activa seleccionada */
  get mesaSeleccionada(): boolean {
    return !!this.espacioSelected?.IdEspacio;
  }

  /** true cuando hay un pedido de llevar/delivery cargado */
  get pedidoLlevarSeleccionado(): boolean {
    return this.idPedidoCobrar > 0 && this.idCanalVentaSelected !== this.canalVentaEnum.ESPACIO;
  }

  async CambiarMozo(): Promise<void> {
    if (!this.mesaSeleccionada) {
      Swal.fire('Cambiar Mozo', 'Debe seleccionar un espacio.', 'info');
      return;
    }
    if (!this.isAdmin) {
      Swal.fire('Cambiar Mozo', 'Solo el administrador puede cambiar el mozo.', 'warning');
      return;
    }

    const inputOptions: Record<string, string> = {};
    (this.listEmpleados || []).forEach(emp => {
      inputOptions[emp.IdEmpleado] = emp.Nombre;
    });

    const { value: idEmpleado } = await Swal.fire<string>({
      title: 'Cambiar Mozo',
      input: 'select',
      inputOptions,
      inputPlaceholder: 'Seleccione un mozo',
      inputValue: this.mozoSelected?.IdEmpleado?.toString() ?? '',
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) return 'Debe seleccionar un mozo.';
        return null;
      }
    });

    if (!idEmpleado) return;

    try {
      this.spinnerService.show();
      const response = await lastValueFrom(
        this.pedidoService.CambiarMozo(this.idPedidoCobrar, this.nroCuentaCobrar, Number(idEmpleado))
      );
      if (response.Success) {
        this.mozoSelected = this.getMozoByMozoId(Number(idEmpleado));
        this.RehacerPantalla();
      } else {
        Swal.fire('Error', 'No se pudo cambiar el mozo.', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Ocurrió un error al cambiar el mozo.', 'error');
    } finally {
      this.spinnerService.hide();
    }
  }

  async CambiarEspacio() {

    if (this.espacioSelected.IdEspacio == null) {
      Swal.fire(
        'Cambiar Espacio',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }
    this.aplicarFiltroCambioEspacio = true;
    this.procesarPedido = true;
    if (this.ambienteActual) {
      await this.MostrarEspacios_x_Ambiente(this.ambienteActual);
    }
    this.RehacerPantallaRefresh === 'RehacerPantalla';
  }

  NuevoPedidoLlevar() {
    this.limpiarPedido();

    const maxBotones = 6;  // Máximo número de botones permitidos
    let nombreCliente = '';  // Variable para almacenar el nombre ingresado
    let socioNegocioSeleccionado: SocioNegocio | null = null;  // Variable para almacenar el SocioNegocio seleccionado

    const estilos = `
    .custom-deny-button {
      background-color: #e0e0e0 !important;  /* Fondo gris claro */
      color: black !important;  /* Texto negro */
      border: 2px solid transparent !important;  /* Sin borde */
      border-radius: 12px !important;  /* Bordes redondeados */
      padding: 12px 24px !important;  /* Espaciado interno */
      font-size: 16px !important;  /* Tamaño de texto */
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;  /* Sombra suave */
      transition: background-color 0.3s ease !important;  /* Transición suave */
    }

    .custom-deny-button:hover {
      background-color: #b0b0b0 !important;  /* Color más oscuro al hacer hover */
    }

    .custom-confirm-button {
      background-color: #4caf50 !important;  /* Fondo verde */
      color: white !important;  /* Texto blanco */
      border: 2px solid transparent !important;  /* Sin borde */
      border-radius: 12px !important;  /* Bordes redondeados */
      padding: 12px 24px !important;  /* Espaciado interno */
      font-size: 16px !important;  /* Tamaño de texto */
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;  /* Sombra suave */
      transition: background-color 0.3s ease !important;  /* Transición suave */
    }

    .custom-confirm-button:hover {
      background-color: #43a047 !important;  /* Verde más oscuro al hacer hover */
    }

    .custom-cancel-button {
      background-color: #f44336 !important;  /* Fondo rojo claro */
      color: white !important;  /* Texto blanco */
      border: 2px solid transparent !important;  /* Sin borde */
      border-radius: 12px !important;  /* Bordes redondeados */
      padding: 12px 24px !important;  /* Espaciado interno */
      font-size: 16px !important;  /* Tamaño de texto */
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;  /* Sombra suave */
      transition: background-color 0.3s ease !important;  /* Transición suave */
    }

    .custom-cancel-button:hover {
      background-color: #e53935 !important;  /* Rojo más oscuro al hacer hover */
    }
  `;

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = estilos;
    document.head.appendChild(styleSheet);

    const buttonDelivery = (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY) ?
      `<button id="btn-custom" style="
    display: inline-block;
    height: 50px;
    margin: 5px;
    background-color: #26a69a;
    color: white;
    border: 2px solid transparent;
    border-radius: 8px;
    font-size: 13px;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
    transition: background-color 0.3s, border-color 0.3s;">
      Delivery
    </button>`: ``;

    // Generar los botones dinámicamente
    const buttonsHTML = (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY) ? this.listaSociosNegocio.map((boton, index) =>
      `<button class="swal2-confirm swal2-styled dynamic-btn" id="boton-${index}" data-descripcion="${boton.Descripcion}"
          style="
          display: inline-block;
          height: 50px;
          margin: 5px;
          background-color: #ff7043;
          color: white;
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          vertical-align: middle;
          cursor: pointer;
          transition: background-color 0.3s, border-color 0.3s;">
          ${boton.Descripcion}
        </button>`
    ).join('') : '';


    // Llenar con botones vacíos si hay menos de 6 opciones
    const emptyButtons = (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY) ? Array.from({ length: maxBotones - this.listaSociosNegocio.length })
      .map(() => `<button class="swal2-confirm swal2-styled dynamic-btn" style="visibility: hidden;"></button>`)
      .join('') : '';

    const title = (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY) ? 'Seleccione una opción' : 'Nombre de Cliente';
    const mostrarSwal = () => {
      Swal.fire({
        title: title,
        html: `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); grid-gap: 5px;">
            ${buttonDelivery + buttonsHTML + emptyButtons}
          </div>
          <br>
          <input type="text" id="nombreCliente" class="swal2-input" placeholder="Ingrese el nombre del cliente"  value="${nombreCliente}" style="font-size: 14px;">
          <br>
          <button id="abrirTecladoDigital" class="swal2-confirm swal2-styled dynamic-btn" 
            style="
            font-size: 12px; 
            height: 50px; 
            background-color: #ff7043; 
            color: white; 
            border: 2px solid transparent; 
            border-radius: 8px; 
            text-align: center;">
            Teclado Digital
          </button>
        `,
        showCancelButton: true,
        showLoaderOnConfirm: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Aceptar',
        showDenyButton: true,
        denyButtonText: 'Sin Nombre',
        customClass: {
          denyButton: 'custom-deny-button',  // Clase personalizada para el botón "Sin Nombre"
          confirmButton: 'custom-confirm-button',  // Clase personalizada para el botón "Aceptar"
          cancelButton: 'custom-cancel-button'  // Clase personalizada para el botón "Cancelar"
        },
        preConfirm: () => {
          const nombreClienteInput = (Swal.getPopup()?.querySelector('#nombreCliente') as HTMLInputElement)?.value;
          if (!nombreClienteInput.trim()) {
            Swal.showValidationMessage('Debe ingresar el nombre del cliente');
          }
          if (!socioNegocioSeleccionado && (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY)) {
            Swal.showValidationMessage('Debe seleccionar una opción');
          }
          return { nombreCliente: nombreClienteInput, socioNegocioSeleccionado };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          console.log('isConfirmed');
          this.espacioSelected.NroPersonas = 0;
          if (this.idCanalVentaSelected === this.canalVentaEnum.PARA_LLEVAR){
            this.clienteSelected.RazonSocial = result.value.nombreCliente;
          }
          if (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY){
            this.clienteSelected.RazonSocial = result.value.socioNegocioSeleccionado.Descripcion + "-" + result.value.nombreCliente;
            this.socioNegocioSelected = result.value.socioNegocioSeleccionado;
          }

          this.processPedido(true);
          console.log('Botón seleccionado:', result.value.botonSeleccionado);
        } else if (result.isDenied) {
          console.log('isDenied');
          this.clienteSelected.RazonSocial = "Sin nombre";
          this.processPedido(true);
          console.log('Nombre del cliente: (sin nombre)');
        }
      });

      document.getElementById('abrirTecladoDigital')?.addEventListener('click', () => {
        Swal.close();
        this.abrirTecladoDigital();
      });

      document.getElementById('btn-custom')?.addEventListener('click', () => {
        Swal.close();
        this.openDialogoDelivery();
      });

      // Asignar comportamiento a los botones dinámicos
      this.listaSociosNegocio.forEach((boton, index) => {
        const botonElement = document.getElementById(`boton-${index}`);
        botonElement?.addEventListener('click', () => {
          // Limpiar la selección previa, asegurarse de que los elementos existen
          document.querySelectorAll('.dynamic-btn').forEach(btn => {
            if (btn instanceof HTMLElement) {
              btn.style.backgroundColor = '#ff7043';
              btn.style.borderColor = 'transparent';
            }
          });

          // Marcar el botón como seleccionado
          botonElement.style.backgroundColor = '#e64a19'; // Cambiar color de fondo al ser seleccionado
          botonElement.style.borderColor = '#fbc531'; // Cambiar color del borde al ser seleccionado
          socioNegocioSeleccionado = boton;    // Almacenar el botón seleccionado
          console.log(`Botón seleccionado: ${socioNegocioSeleccionado.Descripcion}`);
        });
      });
    };

    mostrarSwal();  // Mostrar el Swal al iniciar
  }

  dividirCuenta(): void {

    if (this.espacioSelected.IdEspacio == null) {
      Swal.fire(
        'Cambiar Espacio',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }

    this.openDialogoDividirCuenta(this.espacioSelected, this.idPedidoCobrar)

  }

  openDialogoDividirCuenta(espacioSelected: Espacios, idPedido: number): void {
    const dialogRef = this.dialog.open(DialogDividirCuentaComponent, {
      width: '860px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { idPedido, espacioSelected }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        this.limpiarPedido();
        const listData = await lastValueFrom(this.pedidoService.FindPedidoByIdPedidoNroCuenta(result.idPedido, result.nroCuenta));

        if (listData.Data.length > 0) {
          this.espacioSelected = espacioSelected;
          this.nombreCuenta = " - " + result.nombreCuenta;
          this.rellenarHeaderPedido(listData.Data);
          this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
          this.actualizarDatosGrilla();
        } else {
          await this.showWarningAndReloadEspacios('No existe el pedido en la cuenta.');
        }
      } else {
        this.listaEspaciosTotal = (await lastValueFrom(this.espaciosService.GetAllEspaciosConPedidos())).Data;
        if (this.ambienteActual) {
          await this.MostrarEspacios_x_Ambiente(this.ambienteActual);
        }
      }
    });
  }

  openDialogReportes(): void {
    this.dialog.open(DialogReportesComponent, {
      width: '700px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: {
        idTurno: this.turnoAbierto?.IdTurno,
        config: this.config,
        isAdmin: this.isAdmin
      }
    });
  }

  openDialogoDescuento(itemPedidoDet: PedidoDet): void {

    var idProducto = itemPedidoDet.Producto.IdProducto;
    var nombreCorto = itemPedidoDet.Producto.NombreCorto;
    var descuentoTotal = this.sumaGranTotal;
    var descuentoMaximo = itemPedidoDet.Subtotal;

    const dialogRef = this.dialog.open(DialogDescuentoComponent, {
      width: '720px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: { idProducto, nombreCorto, descuentoTotal, descuentoMaximo }
    });


    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const pedidoDescuentoDTO: PedidoDescuentoDTO = {
          IdPedido: this.idPedidoCobrar,
          NroCuenta: this.nroCuentaCobrar,
          Item: itemPedidoDet.Item,
          Porcentaje: result.retornaPorcentaje,
          IdDescuento: result.retornaIdDescuento,
          NroCupon: result.retornaNroCupon,
          UsuDescuento: this.storageService.getCurrentUser().IdUsuario
        };
        
        this.spinnerService.show();
        await this.pedidoService.AplicarDescuento(pedidoDescuentoDTO).subscribe(async ()=>{
        const listData = await lastValueFrom(this.pedidoService.FindPedidoByIdPedidoNroCuenta(this.idPedidoCobrar, this.nroCuentaCobrar));

          if (listData.Data.length > 0) {
            this.rellenarHeaderPedido(listData.Data);
            this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
            this.actualizarDatosGrilla();
            this.isPanelProductoDisabled = true;
            this.textDescuento = 'Quitar Descuento';
          } else {
            await this.showWarningAndReloadEspacios('No existe el pedido en la cuenta.');
          }
          this.spinnerService.hide();
        })

      
      }
    });
  }

  openDialogoDelivery(): void {

  }
  
  abrirTecladoDigital() {
    const dialogRef = this.dialog.open(DialogMTextComponent, {
      width: '800px',
      data: { title: 'Ingrese el nombre del cliente' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Almacenar el nombre ingresado
        const nombreIngresado = result.value;
        if (nombreIngresado) {
          this.NuevoPedidoLlevar();  // Reabrir el Swal con el valor ingresado
          const inputNombreCliente = Swal.getPopup()?.querySelector('#nombreCliente') as HTMLInputElement | null;
          if (inputNombreCliente) inputNombreCliente.value = nombreIngresado;
        }
      } else {
        // Si se cancela el teclado, vuelve a abrir el Swal sin cambios
        this.NuevoPedidoLlevar();
      }
    });
  }

  abrirEntradas() {
    const dialogRef = this.dialog.open(DialogEntradasComponent, {
      width: '800px'
    });

    dialogRef.afterClosed().subscribe(result => {

    });
  }


  async ListarSubFamilia_x_Familia(oFamilia: Familia) {
    this.selectedItemFamilia = oFamilia;
    this.spinnerService.show();
    this.listProducts_x_SubFamilia = [];
    this.listSubFamilia_x_Familia = this.listSubFamilia.filter(x => x.IdFamilia === oFamilia.IdFamilia);
    let oSubFamilia = this.listSubFamilia_x_Familia.find((item) => (item.IdFamilia === oFamilia.IdFamilia));
    if (oSubFamilia) this.ListarProductos_x_SubFamilia(oSubFamilia);
    this.spinnerService.hide();
  }

  async ListarProductos_x_SubFamilia(oSubFamilia: SubFamilia) {
    this.spinnerService.show();
    this.selectedItemSubFamilia = oSubFamilia;
    this.IdSubFamila = oSubFamilia.IdSubFamilia;
    console.log(this.listProducts);
    this.listProducts_x_SubFamilia = this.listProducts.filter(x => x.IdSubFamilia === oSubFamilia.IdSubFamilia && x.Posicion > 0);
    //this.GridListaPedidoDetProducto.data = this.ListaPedidoDetProducto.filter(x=> x.IdSubFamilia===subFamiliaId);
    this.spinnerService.hide();
  }

  ingresarCodigoCortesia(oPedidoDet: PedidoDet) {
    if (oPedidoDet.NroCupon) {
      // Si ya hay un código ingresado, mostrarlo en un SweetAlert con opción de eliminarlo
      Swal.fire({
        title: 'Código de cortesía ingresado',
        text: `El código ingresado es: ${oPedidoDet.NroCupon}`,
        showCancelButton: true,
        confirmButtonText: 'Eliminar código',
        cancelButtonText: 'Mantener código'
      }).then((result) => {
        if (result.isConfirmed) {
          // Eliminar el código
          oPedidoDet.NroCupon = "";
          Swal.fire({
            title: 'Código eliminado',
            icon: 'success',
            confirmButtonText: 'OK'
          });
        }
      });
    } else {
      // Si no hay código ingresado, abrir el diálogo para ingresar uno nuevo
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Código de Cortesía',
          hideNumber: false, // Mostrar los números
          decimalActive: false, // Desactivar el punto decimal si solo se permiten enteros
        }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.value) {
          const codigoIngresado = result.value;
          oPedidoDet.NroCupon = codigoIngresado;
          oPedidoDet.IdDescuento = "001";
        }
      });
    }
  }

  ingresarCodigosAnfitrionas(oPedidoDet: PedidoDet) {
    let codigoCounter = 1;  // Para llevar el control del número de códigos ingresados
    const codigosAnfitriona: string[] = [];  // Almacena los códigos ingresados

    Swal.fire({
      title: 'Ingresar códigos de Anfitrionas',
      html: `
        <div id="inputs-container">
          <div id="codigo-div1">
            <input type="text" id="codigo1" class="swal2-input" placeholder="Código 1" readonly>
            <button type="button" class="remove-btn" id="remove1">Eliminar</button>
          </div>
        </div>
        <button id="add-more" type="button" class="swal2-confirm swal2-styled" style="margin-top: 10px;">Agregar más</button>
      `,
      focusConfirm: false,
      preConfirm: () => {
        // Recoger todos los inputs que contengan códigos
        const codigos: string[] = [];
        for (let i = 1; i <= codigoCounter; i++) {
          const inputDiv = document.getElementById(`codigo-div${i}`);
          if (inputDiv) {  // Asegurarse de que el div existe (si no ha sido eliminado)
            const codigoInput = (document.getElementById(`codigo${i}`) as HTMLInputElement).value;
            if (codigoInput) {
              codigos.push(`ANFITRIONA ${codigoInput}`); // Agregar el prefijo "ANFITRIONA"
            }
          }
        }
        return codigos;  // Devuelve la lista de códigos con el prefijo
      },
      didOpen: () => {
        // Manejar la lógica para agregar más inputs cuando se presiona "Agregar más"
        const addMoreButton = document.getElementById('add-more');
        addMoreButton?.addEventListener('click', () => {
          codigoCounter++;
          const inputsContainer = document.getElementById('inputs-container');
          if (inputsContainer) {
            const newDiv = document.createElement('div');
            newDiv.id = `codigo-div${codigoCounter}`;
            newDiv.innerHTML = `
              <input type="text" id="codigo${codigoCounter}" class="swal2-input" placeholder="Código ${codigoCounter}" readonly>
              <button type="button" class="remove-btn" id="remove${codigoCounter}">Eliminar</button>
            `;
            inputsContainer.appendChild(newDiv);

            // Agregar evento de eliminación al nuevo botón
            const removeButton = document.getElementById(`remove${codigoCounter}`);
            removeButton?.addEventListener('click', () => {
              document.getElementById(`codigo-div${codigoCounter}`)?.remove();
            });

            // Abrir el teclado numérico personalizado para ingresar el nuevo código
            this.openDialogMCant(codigoCounter);
          }
        });

        // Abrir el teclado numérico para el primer código
        this.openDialogMCant(1);
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const codigos = result.value?.join(', '); // Convertir la lista en una cadena separada por comas
        oPedidoDet.Anfitriona = codigos;
      }
    });
  }


  openDialogMCant(codigoIndex: number) {
    // Ocultar el contenedor de SweetAlert2 antes de abrir el diálogo
    const swalContainer = document.querySelector('.swal2-container') as HTMLElement;
    if (swalContainer) {
      swalContainer.style.display = 'none';  // Ocultar temporalmente SweetAlert2
    }

    // Abrir el DialogMCantComponent para ingresar el código
    const dialogRef = this.dialog.open(DialogMCantComponent, {
      width: '350px',
      data: {
        title: `Ingresar Código de Anfitriona ${codigoIndex}`,
        hideNumber: false,
        decimalActive: false
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      // Volver a mostrar el contenedor de SweetAlert2 después de cerrar el diálogo
      if (swalContainer) {
        swalContainer.style.display = 'block';  // Restaurar la visibilidad de SweetAlert2
      }

      if (result && result.value) {
        const inputElement = document.getElementById(`codigo${codigoIndex}`) as HTMLInputElement;
        if (inputElement) {
          inputElement.value = result.value;  // Asignar el valor ingresado al input correspondiente
        }
      }
    });
  }


  async openPedido(pedido: PedidoDeliveryDTO) {
    this.limpiarPedido();
    const listData: ApiResponse<PedidoEspacioDTO[]> = await lastValueFrom(this.pedidoService.FindPedidoByIdPedidoNroCuenta(pedido.IdPedido, pedido.NroCuenta));
    if (listData.Data.length > 0) {
      this.rellenarHeaderPedido(listData.Data);
      this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
      this.actualizarDatosGrilla();
    } else {


      Swal.fire(
        'Ups.!',
        'No existe el pedido.',
        'warning'
      );
      lastValueFrom(this.pedidoService.ObtenerPedidosByIdTurno(this.turnoAbierto.IdTurno));
    }
  }

  async openDialogEspacio(espacio: Espacios) {
    this.spinnerService.show();

    if (this.aplicarFiltroTrasladoProducto) {
      await this.ejecutarTraslado(espacio);
      this.spinnerService.hide();
      return;
    }

    if (this.aplicarFiltroTrasladarAEspacio) {
      await this.ejecutarTrasladarAEspacio(espacio);
      this.spinnerService.hide();
      return;
    }

    if (espacio.Ocupado === 0 || espacio.Ocupado === 2) {
      await this.handleEspacioDisponible(espacio);
    } else if (espacio.Ocupado === 1 || espacio.Ocupado === 4) {
      await this.handleEspacioOcupada(espacio);
    } else {
      await this.handleEspacioDividirCuenta(espacio);
    }

    this.RehacerPantallaRefresh = 'RehacerPantalla';
    this.spinnerService.hide();
  }

  iniciarTraslado(producto: PedidoDet): void {
    if (this.espacioSelected.IdEspacio == null) {
      Swal.fire('Traslado Producto', 'Debe tener una mesa seleccionada.', 'info');
      return;
    }
    this.productoParaTraslado = producto;
    this.aplicarFiltroTrasladoProducto = true;
    this.MostrarOcultarPanelEspacio = true;
    this.MostrarOcultarPanelProducto = false;
    if (this.ambienteActual) {
      this.MostrarEspacios_x_Ambiente(this.ambienteActual);
    }
  }

  cancelarTraslado(): void {
    this.productoParaTraslado = null;
    this.aplicarFiltroTrasladoProducto = false;
    if (this.ambienteActual) {
      this.MostrarEspacios_x_Ambiente(this.ambienteActual);
    }
  }

  iniciarTrasladarAEspacio(): void {
    if (this.idPedidoCobrar <= 0) {
      Swal.fire('Trasladar a Mesa', 'Debe seleccionar un pedido.', 'info');
      return;
    }
    this.aplicarFiltroTrasladarAEspacio = true;
    this.MostrarOcultarPanelEspacio = true;
    this.MostrarOcultarPanelProducto = false;
    const ambienteBase = this.ambienteActual
      ?? this.listAmbiente?.find(a => a.Estado === 1)
      ?? this.listAmbiente?.[0];
    if (ambienteBase) this.MostrarEspacios_x_Ambiente(ambienteBase);
  }

  cancelarTrasladarAEspacio(): void {
    this.aplicarFiltroTrasladarAEspacio = false;
    if (this.ambienteActual) {
      this.MostrarEspacios_x_Ambiente(this.ambienteActual);
    }
  }

  async ejecutarTrasladarAEspacio(espacio: Espacios): Promise<void> {
    try {
      const response = await lastValueFrom(this.pedidoService.TrasladarAEspacio(this.idPedidoCobrar, espacio.IdEspacio));
      if (response.Success) {
        this.aplicarFiltroTrasladarAEspacio = false;
        this.RehacerPantalla();
      } else {
        Swal.fire('Trasladar a Mesa', response.Message || 'No se pudo trasladar el pedido.', 'warning');
      }
    } catch {
      Swal.fire('Error', 'Ocurrió un error al trasladar el pedido.', 'error');
    }
  }

  async ejecutarTraslado(espacioDestino: Espacios): Promise<void> {
    const p = this.productoParaTraslado!;
    const dto: TrasladarProductoDTO = {
      IdPedido: p.IdPedido,
      NroCuenta: p.NroCuenta,
      Item: p.Item,
      IdEspacioDestino: espacioDestino.IdEspacio
    };
    try {
      const response = await lastValueFrom(this.pedidoService.TrasladarProducto(dto));
      if (response.Success) {
        this.productoParaTraslado = null;
        this.aplicarFiltroTrasladoProducto = false;
        this.RehacerPantalla();
      } else {
        Swal.fire('Traslado Producto', 'No se pudo realizar el traslado.', 'warning');
      }
    } catch (e) {
      Swal.fire('Error', 'Ocurrió un error al trasladar el producto.', 'error');
    }
  }

  async handleEspacioDisponible(espacio: Espacios) {
    if (this.aplicarFiltroCambioEspacio) {
      const response = await lastValueFrom(this.espaciosService.CambiarEspacio(this.espacioSelected.IdEspacio, espacio.IdEspacio));
      if (response.Data) this.RehacerPantalla();
    } else {
      this.limpiarPedido();
      this.mozoSelected = this.getMozoByMozoId(this.storageService.getCurrentSession().User.IdEmpleado);
      this.espacioSelected = espacio;

      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: { title: 'Ingrese Nro Pax', hideNumber: false, decimalActive: false }
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result?.value && result.value > 0) {
          this.espacioSelected.NroPersonas = result.value;
          this.processPedido(true);
        } else {
          return 'Debe ingresar un número válido mayor que 0';
        }
      });
    }
  }

  async handleEspacioOcupada(espacio: Espacios) {
    if (this.aplicarFiltroUnirEspacio) {
      const response = await lastValueFrom(this.espaciosService.UnirEspacio(this.espacioSelected.IdEspacio, espacio.IdEspacio, this.storageService.getCurrentSession().User.IdUsuario));
      if (response.Data) this.RehacerPantalla();
    } else {
      this.limpiarPedido();
      const listData = await lastValueFrom(this.pedidoService.FindPedidoByIdEspacio(espacio.IdEspacio));
      if (listData.Data.length > 0) {
        this.espacioSelected = espacio;
        this.rellenarHeaderPedido(listData.Data);
        this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
        this.actualizarDatosGrilla();
      } else {
        await this.showWarningAndReloadEspacios('No existe el pedido en la espacio.');
      }
    }
  }

  async handleEspacioDividirCuenta(espacio: Espacios) {
    this.limpiarPedido();
    const listData = await lastValueFrom(this.pedidoService.FindPedidoByIdEspacio(espacio.IdEspacio));
    if (listData.Data.length > 0) {
      this.openDialogoDividirCuenta(espacio, listData.Data[0].IdPedido);
    } else {
      await this.showWarningAndReloadEspacios('No existe el pedido en la espacio.');
    }
  }

  async showWarningAndReloadEspacios(message: string) {
    Swal.fire('Ups.!', message, 'warning');
    this.listaEspaciosTotal = (await lastValueFrom(this.espaciosService.GetAllEspaciosConPedidos())).Data;
  }


  calcularTotales(): void {
    let totalAux = 0;
    let desctoAux = 0;
    let impuestoBolsa = 0;

    this.gridListaPedidoDetProducto.data.forEach(item => {
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

  async openDialogVerPedido(IdEspacio: number) {
    try {
      this.spinnerService.show();

      const listData: ApiResponse<PedidoEspacioDTO[]> = await lastValueFrom(this.pedidoService.FindPedidoByIdEspacio(IdEspacio));

      if (listData.Data.length > 0) {
        // this.rellenarHeaderPedido(listData);

        const dialogEnviarPedidoRef = this.dialogEspacio.open(DialogVerPedidoComponent, {
          disableClose: true,
          hasBackdrop: true,
          width: '400px',
          data: { oPedidoEspacio: listData.Data, IdEspacio: IdEspacio, Espacio: this.espacioSelected.Descripcion + ' ' + this.espacioSelected.Numero }
        });

        dialogEnviarPedidoRef.afterClosed().subscribe(data => {

          if (data.Resultado) {
            this.RehacerPantalla();
          }
        });

      } else {

        Swal.fire(
          'Ups.!',
          'No existe el pedido en la espacio.',
          'warning'
        );
        this.listaEspaciosTotal = (await lastValueFrom(this.espaciosService.GetAllEspaciosConPedidos())).Data;
      }


    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);
    } finally {
      this.spinnerService.hide();

    }

  }

  async openDialoObservaciones(oPedidoDet: PedidoDet) {
    try {
      if (oPedidoDet.Cantidad == 0) {
        Swal.fire(
          'Ups.!',
          'Agregue primero la cantidad.',
          'warning'
        );
      } else {
        this.spinnerService.show();


        const dialogEnviarPedidoRef = this.dialogEspacio.open(DialogObservacionComponent, {
          hasBackdrop: true,
          width: '700px',
          data: { ListaObservacion: this.listObservacion.filter(x => x.Activo == 1), Observaciones: oPedidoDet.Observacion, NombreCorto: oPedidoDet.Producto.NombreCorto }
        });

        dialogEnviarPedidoRef.afterClosed().subscribe(Resultado => {
          oPedidoDet.Observacion = Resultado.Observaciones;
        })
      }
    } catch (e) {
      Swal.fire(
        'Algo anda mal',
        e.error,
        'error'
      )
      console.log(e);
    } finally {
      this.spinnerService.hide();

    }

  }



  async aumentarProductGrid(oPedidoDet: PedidoDet) {


    oPedidoDet.Cantidad += 1;

    var dSubDescuento = (oPedidoDet.MontoDescuento / oPedidoDet.Cantidad);
    var dSubtotal = oPedidoDet.Cantidad * oPedidoDet.Precio;

    oPedidoDet.Subtotal = (dSubtotal) - (oPedidoDet.Cantidad * dSubDescuento);
    oPedidoDet.MontoDescuento = (dSubDescuento * oPedidoDet.Cantidad);

    this.calcularTotales();
  }

  async restarProductGrid(pedidoDet: PedidoDet) {


    if (pedidoDet.Cantidad > 1) {
      pedidoDet.Cantidad -= 1;

      var dSubDescuento = (pedidoDet.MontoDescuento / pedidoDet.Cantidad);
      var dSubtotal = pedidoDet.Cantidad * pedidoDet.Precio;

      pedidoDet.Subtotal = (dSubtotal) - (pedidoDet.Cantidad * dSubDescuento);
      pedidoDet.MontoDescuento = (dSubDescuento * pedidoDet.Cantidad);
      this.calcularTotales();
    } else {
      var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidoDet);
      this.listProductGrid.splice(removeIndex, 1);
      this.actualizarDatosGrilla();

    }

  }

  actualizarDatosGrilla() {
    this.gridListaPedidoDetProducto.data = this.listProductGrid;  // Actualizamos la fuente de datos
    this.shouldScroll = true;  // Activamos el scroll para el siguiente ciclo de detección de cambios
    this.calcularTotales();
  }

  async realizarEliminacion(pedidoDet: PedidoDet, motivoAnulacion: string, idUsuAnula: number) {

    var pedidoDelete: AnularProductoYComplementoDTO = {
      IdEspacio: this.espacioSelected.IdEspacio,
      NroCuenta: pedidoDet.NroCuenta,
      UsuAnula: idUsuAnula,
      MotivoAnula: motivoAnulacion,
      IdPedido: pedidoDet.IdPedido,
      IdProducto: pedidoDet.Producto.IdProducto,
      Item: pedidoDet.Item,
      Ip: this.storageService.getCurrentIP()
    };

    this.spinnerService.show();
    var responseService: ApiResponse<ImpresionDTO[]> = await lastValueFrom(this.pedidoService.AnularProductoYComplemento(pedidoDelete));

    if (responseService.Success == true) {
      const contador = await this.imprimir(responseService.Data);

      if (contador === responseService.Data.length) {
        const pedido = responseService.Data[0];
        this.pedidoService.ActualizarNumAnulaItemImpresion(pedido.IdPedido, pedido.Item).subscribe(response => {
          console.log('Envios actualizados correctamente', response);
        }, error => {
          console.error('Error al actualizar los envíos', error);
        });
      }

      var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidoDet);
      this.listProductGrid.splice(removeIndex, 1);
      this.actualizarDatosGrilla();
      if (this.listProductGrid.length == 0) {
        this.limpiarPedido();
        this.RehacerPantalla();
      }
    }
    this.spinnerService.hide();
  }

  deleteProductGrid(pedidoDet: PedidoDet) {
    const currentUser = this.storageService.getCurrentUser();
    if (pedidoDet.Item > 0) {
      if (currentUser.IdNivel === 1) {
        // Usar DialogMTextTouchComponent para el motivo de anulación
        const dialogRef = this.dialog.open(DialogMTextComponent, {
          width: '800px',
          data: { title: `¿Está seguro de eliminar el producto ${pedidoDet.Producto.NombreCorto}?` }
        });

        dialogRef.afterClosed().subscribe(result => {

          if (result && result.value) {
            const motivoAnulacion = result.value;
            this.realizarEliminacion(pedidoDet, motivoAnulacion, this.storageService.getCurrentSession().User.IdUsuario);
          }
        });
      } else {
        // Si el usuario no es de nivel "001", pedir primero el código del administrador con DialogMCantComponent
        const dialogRef = this.dialog.open(DialogMCantComponent, {
          width: '350px',
          data: {
            title: 'Ingresar Código de Administrador',
            hideNumber: true,
            decimalActive: false
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.value) {
            const codigoAdmin = result.value;
            // Validar el código del administrador llamando a la API
            this.usuarioService.getUsuarioAuth(NivelUsuarioEnum.Administrador, codigoAdmin).subscribe((response: ApiResponse<Usuario>) => {
              if (response.Success) {
                if (response.Data) {
                  // Mostrar el DialogMTextTouchComponent para el motivo de anulación
                  const motivoRef = this.dialog.open(DialogMTextComponent, {
                    width: '800px',
                    data: { title: `¿Está seguro de eliminar el producto ${pedidoDet.Producto.NombreCorto}?` }
                  });

                  motivoRef.afterClosed().subscribe(result => {

                    if (result && result.value) {
                      const motivoAnulacion = result.value;

                      this.realizarEliminacion(pedidoDet, motivoAnulacion, response.Data.IdUsuario);
                    }
                  });
                } else {

                  Swal.fire({
                    title: 'Código inválido',
                    text: 'El código ingresado no es correcto.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                  });
                }
              }
            });
          }
        });
      }
    } else {
      var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidoDet);
      this.listProductGrid.splice(removeIndex, 1);
      this.actualizarDatosGrilla();
    }
  }



  public AgregarProducto(product: Producto): void {

    // Verificar si el producto tiene el flag SinPrecio
    if (product.SinPrecio == 1) {
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Precio',
          hideNumber: false, // Mostrar los números
          decimalActive: true // Activar el punto decimal si el precio permite decimales
        }
      });

      dialogRef.afterClosed().subscribe((result) => {
        // Si se ingresó un valor de precio
        if (result && result.value) {
          const precioIngresado = result.value;
          product.Precio = precioIngresado;

          // Llamar a la lógica para agregar el producto solo si se ingresó el precio
          this.procesarAgregarProducto(product);
        }
      });
    } else {
      // Si SinPrecio no es igual a 1, agrega el producto directamente
      this.procesarAgregarProducto(product);
    }
  }

  private procesarAgregarProducto(product: Producto): void {
    // Crear el detalle del pedido con el precio y la cantidad
    const pedidoDet = new PedidoDet({
      Item: this.DEFAULT_ID,
      IdPedido: this.idPedidoCobrar == 0 ? this.DEFAULT_ID : this.idPedidoCobrar,
      NroCuenta: this.nroCuentaCobrar == 0 ? this.DEFAULT_ID : this.nroCuentaCobrar,
      NombreCuenta: "Pedido Inicial",
      Producto: new Producto(product),
      PedidoComplemento: [],
      Precio: product.Precio,
      Cantidad: 1,
      Subtotal: 1 * product.Precio,
      Observacion: '',
      MontoDescuento: 0,
      Impuesto1: 0,
      Ip: this.storageService.getCurrentIP()
    });

    // Verificar si el producto tiene complementos
    if (product.Tipo == 2) {
      this.AgregarProductoComplemento(pedidoDet);
    }

    // Agregar el producto al grid de productos
    this.listProductGrid.push(pedidoDet);
    this.actualizarDatosGrilla();
  }

  AgregarProductoComplemento(pedidodet: PedidoDet) {

    const dialogRef = this.dialog.open(DialogComplementosComponent, {
      hasBackdrop: true,
      width: '880px',
      height: '630px',
      data: {
        pedidodet: pedidodet,
        listProducts: this.listProducts
      }
    });

    dialogRef.afterClosed().subscribe((item) => {
      if (item) {
        if (item.pedidodet.Item > 0) {
          const iCantidad = item.pedidodet.Cantidad;
          const dPrecio = item.pedidodet.Precio;
          const dSubtotal = iCantidad * dPrecio;

          item.pedidodet.Cantidad = iCantidad;
          item.pedidodet.Subtotal = dSubtotal;

        }
      } else {
        if (pedidodet.Item == 0) {
          var removeIndex = this.listProductGrid.map(function (item) { return item }).indexOf(pedidodet);
          this.listProductGrid.splice(removeIndex, 1);
          this.actualizarDatosGrilla();
        }
      }
    });
  }

  openProductSearch(): void {
    const dialogRef = this.dialog.open(DialogProductSearchComponent, {
      width: '970px',
      height: '850px',
      data: { listProducts: this.listProductoVenta }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.AgregarProducto(result);
      }
    });
  }

  async AnularPedido() {

    if (this.espacioSelected.IdEspacio == null) {
      Swal.fire(
        'Anular Pedido',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }

    const currentUser = this.storageService.getCurrentUser();

    if (currentUser.IdNivel === 1) {
      // Usar DialogMTextTouchComponent para el motivo de anulación
      const dialogRef = this.dialog.open(DialogMTextComponent, {
        width: '800px',
        data: { title: `¿Está seguro de anular el pedido de ${this.espacioSelected.Descripcion} ${this.espacioSelected.Numero}?` }
      });

      dialogRef.afterClosed().subscribe(result => {

        if (result && result.value) {
          const motivoAnulacion = result.value;
          this.RealizarAnulacionPedido(this.espacioSelected, motivoAnulacion, this.storageService.getCurrentSession().User.IdUsuario);
        }
      });
    } else {
      // Si el usuario no es de nivel "001", pedir primero el código del administrador con DialogMCantComponent
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Código de Administrador',
          hideNumber: true,
          decimalActive: false
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.value) {
          const codigoAdmin = result.value;
          // Validar el código del administrador llamando a la API
          this.usuarioService.getUsuarioAuth(NivelUsuarioEnum.Administrador, codigoAdmin).subscribe((response: ApiResponse<Usuario>) => {
            if (response.Success) {
              if (response.Data) {
                // Mostrar el DialogMTextTouchComponent para el motivo de anulación
                const motivoRef = this.dialog.open(DialogMTextComponent, {
                  width: '800px',
                  data: { title: `¿Está seguro de anulado el pedido de ${this.espacioSelected.Descripcion} ${this.espacioSelected.Numero}?` }
                });

                motivoRef.afterClosed().subscribe(result => {

                  if (result && result.value) {
                    const motivoAnulacion = result.value;

                    this.RealizarAnulacionPedido(this.espacioSelected, motivoAnulacion, response.Data.IdUsuario);
                  }
                });
              } else {

                Swal.fire({
                  title: 'Código inválido',
                  text: 'El código ingresado no es correcto.',
                  icon: 'error',
                  confirmButtonText: 'OK'
                });
              }
            }
          });
        }
      });
    }
  }


  async RealizarAnulacionPedido(espacio: Espacios, motivoAnulacion: string, idUsuAnula: number) {
    this.spinnerService.show();
    var responseService: ApiResponse<ImpresionDTO[]> = await lastValueFrom(this.pedidoService.AnularPedido(espacio.IdEspacio, idUsuAnula, motivoAnulacion, this.storageService.getCurrentIP()));

    if (responseService.Success == true) {
      const contador = await this.imprimir(responseService.Data);

      if (contador === responseService.Data.length) {
        const pedido = responseService.Data[0];
        this.pedidoService.ActualizarNumAnulaPedidoImpresion(pedido.IdPedido, pedido.NroCuenta).subscribe(response => {
          console.log('Envios actualizados correctamente', response);
        }, error => {
          console.error('Error al actualizar los envíos', error);
        });
      }
      this.limpiarPedido();
      this.RehacerPantalla();
    }
    this.spinnerService.hide();
  }

  scrollLeft() {
    const container = document.querySelector<HTMLElement>('.static-buttons-row');
    if (container) container.scrollLeft -= 100;
  }

  scrollRight() {
    const container = document.querySelector<HTMLElement>('.static-buttons-row');
    if (container) container.scrollLeft += 100;
  }

  async processPedido(verPanelProducto: boolean) {

    if (this.espacioSelected.IdEspacio == null && this.idCanalVentaSelected === this.canalVentaEnum.ESPACIO) {
      Swal.fire(
        'Procesar Pedido',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }
    this.procesarPedido = true;
    this.isAnularPedidoDisabled = true;
    this.isComboDisabled = false;
    this.isVerComplementoDisabled = false;
    this.isReImprimirDisabled = false;
    this.MostrarOcultarPanelEspacio = !verPanelProducto;
    this.MostrarOcultarPanelProducto = verPanelProducto;
    this.isCanalVentaDisabled = true;

    if (this.sumaDscto > 0) {
      this.isPanelProductoDisabled = true;
      this.textDescuento = 'Quitar Descuento';
    } else {
      this.isPanelProductoDisabled = false;
      this.textDescuento = 'Descuento';
    }

    let oFamilia = this.listFamilia[0];
    this.ListarSubFamilia_x_Familia(oFamilia);


  }

  VerPedido() {
    if (this.selectedRow.PedidoComplemento.length == 0) {
      return;
    }
    this.AgregarProductoComplemento(this.selectedRow);
  }

   aplicarDescuento(){
    if (this.textDescuento === "Quitar Descuento") {
      this.quitarDescuento();
    }else{
      this.openDialogoDescuento(this.selectedRow);
    }
    
   }
   quitarDescuento() {
    
      Swal.fire({
        title: '¿Está seguro de quitar el descuento?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isConfirmed) {
            this.pedidoService.QuitarDescuento(this.idPedidoCobrar, this.nroCuentaCobrar).subscribe(async () => {
              const listData = await lastValueFrom(this.pedidoService.FindPedidoByIdPedidoNroCuenta(this.idPedidoCobrar, this.nroCuentaCobrar));

              if (listData.Data.length > 0) {
                this.rellenarHeaderPedido(listData.Data);
                this.listProductGrid = this.getPedidoDetByResponse(listData.Data);
                this.actualizarDatosGrilla();
              } else {
                await this.showWarningAndReloadEspacios('No existe el pedido en la cuenta.');
              }
            });
  
          this.textDescuento = "Descuento"; // Restablecer el texto del combo
          this.isPanelProductoDisabled = false;
        } else {
          return; 
        }
      });
    }
  

  async ImprimirPrecuenta() {
    if (this.espacioSelected.IdEspacio == null) {
      Swal.fire(
        'Imprimir Precuenta',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }

    var responseRegisterPedido: ApiResponse<ImpresionDTO[]> = await lastValueFrom(this.pedidoService.ImprimirPrecuenta(this.idPedidoCobrar, this.nroCuentaCobrar));

    if (responseRegisterPedido.Success) {
      this.imprimir(responseRegisterPedido.Data);
      this.RehacerPantalla(); // Llamar a la función Rehacer si está visible el botón Rehacer
    }
  }

  async EnviarPedido() {
    if (this.espacioSelected.IdEspacio == null && this.idCanalVentaSelected === this.canalVentaEnum.ESPACIO) {
      Swal.fire(
        'Enviar Pedido',
        'Debe seleccionar una espacio.',
        'info'
      );
      return;
    }

    this.spinnerService.show();
    this.procesarPedido = true;
    if (this.listProductGrid.length > 0) {

      var listPedidoDetails: PedidoDet[] = [];

      this.listProductGrid.forEach(itemGrid => {
        let pedidoDetail: PedidoDet = new PedidoDet(
          {
            Item: itemGrid.Item,
            IdPedido: itemGrid.IdPedido,
            NroCuenta: itemGrid.NroCuenta,
            Producto: itemGrid.Producto,
            Precio: itemGrid.Precio,
            Cantidad: itemGrid.Cantidad,
            Subtotal: itemGrid.Precio * itemGrid.Cantidad,
            Observacion: itemGrid.Observacion,
            Anfitriona: itemGrid.Anfitriona,
            NroCupon: itemGrid.NroCupon,
            IdDescuento: itemGrid.IdDescuento,
            Ip: this.storageService.getCurrentIP(),
            NombreCuenta: itemGrid.NombreCuenta,
            PedidoComplemento: itemGrid.PedidoComplemento,
            Estado:1
          }
        );

        listPedidoDetails.push(pedidoDetail);
      });

      var pedido: PedidoCab = new PedidoCab(
        {
          IdEmpleado: (this.idCanalVentaSelected != this.canalVentaEnum.ESPACIO) ? this.idEmpleadoLlevar : this.mozoSelected?.IdEmpleado,
          IdPedido: this.idPedidoCobrar == 0 ? this.DEFAULT_ID : this.idPedidoCobrar,
          NroCuenta: this.nroCuentaCobrar == 0 ? this.DEFAULT_ID : this.nroCuentaCobrar,
          Total: this.getTotalByListProductGrid(),
          Importe: this.getTotalByListProductGrid(),
          UsuReg: this.storageService.getCurrentSession().User.IdUsuario,
          UsuMod: this.storageService.getCurrentSession().User.IdUsuario,
          IdEspacio: (this.idCanalVentaSelected === this.canalVentaEnum.ESPACIO) ? this.espacioSelected.IdEspacio : 9999,
          Espacio: (this.idCanalVentaSelected === this.canalVentaEnum.ESPACIO) ? this.espacioSelected.Espacio : '',
          NroPax: (this.idCanalVentaSelected === this.canalVentaEnum.ESPACIO) ? this.espacioSelected.NroPersonas : 0,
          IdCaja: this.turnoAbierto.IdCaja,
          IdTurno: this.turnoAbierto.IdTurno,
          Moneda: this.config?.IdMoneda ?? 'SOL',
          IdSocioNegocio: (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY ) ? this.socioNegocioSelected.IdSocioNegocio : 0,
          Cliente: (this.idCanalVentaSelected === this.canalVentaEnum.ESPACIO) ? this.listProductGrid[0]?.Anfitriona : this.clienteSelected.RazonSocial, /*solo para trago gratis */
          Direccion: (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY) ? this.clienteSelected.DireccionDelivery : '', /*solo para delivery*/
          Referencia: (this.idCanalVentaSelected === this.canalVentaEnum.DELIVERY) ? this.clienteSelected.ReferenciaDelivery : '', /*solo para delivery*/
          IdCanalVenta: this.idCanalVentaSelected,
          ListaPedidoDet: listPedidoDetails,
          Estado:1
        }
      );

      var responseRegisterPedido: ApiResponse<ImpresionDTO[]> = await lastValueFrom(this.pedidoService.GrabarPedido(pedido));

      if (responseRegisterPedido.Success) {

        this.imprimirPedido(responseRegisterPedido);
        this.limpiarPedido();
        this.procesarPedido = false;
        this.RehacerPantalla();

        this.MostrarOcultarPanelEspacio = true;
        this.MostrarOcultarPanelProducto = false;
      }
      this.spinnerService.hide();
    } else {
      Swal.fire('Oops...', 'No ha ingresado ningun producto.', 'error')
      this.spinnerService.hide();
    }

  }

  async imprimirPedido(responseRegisterPedido: ApiResponse<ImpresionDTO[]>) {
    const contador = await this.imprimir(responseRegisterPedido.Data);

    if (contador === responseRegisterPedido.Data.length) {
      const pedido = responseRegisterPedido.Data[0];
      this.pedidoService.ActualizarEnviosDeImpresion(pedido.IdPedido, pedido.NroCuenta).subscribe(response => {
        console.log('Envios actualizados correctamente', response);
      }, error => {
        console.error('Error al actualizar los envíos', error);
      });
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

  async processComprobante() {
    if (this.idPedidoCobrar > 0) {
      var allSaved: Boolean = true;
      for (var i = 0; i < this.listProductGrid.length; i++) {
        if (this.listProductGrid[i].Item == 0) {
          allSaved = false;
          break;
        }
      }
      if (allSaved) {

        var dataSet: any = {

          idPedido: this.idPedidoCobrar,
          userRegister: this.storageService.getCurrentSession().User.IdUsuario,
          productGrid: this.listProductGrid
        };

        const dialogProcessComprobante = this.dialogComprobante.open(DialogEmitirComprobanteComponent, {
          width: '900px',
          maxWidth: '95vw',
          data: dataSet,
          hasBackdrop: true
        });

        var resultDialog: any = await lastValueFrom(dialogProcessComprobante.afterClosed());
        this.listaEspaciosTotal = (await lastValueFrom(this.espaciosService.GetAllEspaciosConPedidos())).Data;
        this.limpiarPedido();
        this.MostrarOcultarPanelEspacio = true;
        this.MostrarOcultarPanelProducto = false;
      } else {
        alert('No guardo todos los productos de la grilla.')
      }
    } else {
      alert('Debe tener todo el pedido guardado.')
    }
  }

  RehacerPantalla() {
    try {
      this.spinnerService.show();
      this.enterFullScreen();

      this.aplicarFiltroCambioEspacio = false;
      this.aplicarFiltroUnirEspacio = false;
      this.aplicarFiltroTrasladoProducto = false;
      this.aplicarFiltroTrasladarAEspacio = false;
      this.productoParaTraslado = null;
      // Actualizar espacios
      lastValueFrom(this.espaciosService.GetAllEspaciosConPedidos()).then(data => {
        this.listaEspaciosTotal = data.Data;
        const result = this.listAmbiente.find(item => item.Estado == 1);
        if (result) this.MostrarEspacios_x_Ambiente(result);
      }).catch(error => {
        console.error('Error al obtener espacios', error);
      });

      // Actualizar pedidos
      lastValueFrom(this.pedidoService.ObtenerPedidosByIdTurno(this.turnoAbierto.IdTurno)).then(responsePedidos => {
        if (responsePedidos.Success) {
          this.listaPedidosPendientes = responsePedidos.Data;
        }
        this.canalVenta(this.idCanalVentaSelected);
      }).catch(error => {
        console.error('Error al obtener pedidos', error);
      });

      // Limpieza de la pantalla y actualización de paneles
      this.limpiarPedido();
      this.MostrarOcultarPanelEspacio = true;
      this.MostrarOcultarPanelProducto = false;
      this.RehacerPantallaRefresh = 'Refresh';
      this.isCanalVentaDisabled = false;
    } catch (error) {
      Swal.fire(
        'Good job!',
        'Error interno, actualice.',
        'error'
      );
    } finally {
      this.spinnerService.hide();
    }
  }



  /** Devuelve el símbolo de moneda para un producto.
   *  Usa la moneda del producto si coincide con la config; de lo contrario el símbolo por defecto. */
  getSimboloProducto(monedaVenta: string): string {
    return this.config?.SimboloMoneda || '-';
  }

  /**
   * Extrae solo el valor de background-color del campo Color del producto.
   * El campo puede venir como "background-color: #FF0000" o simplemente "#FF0000" o "red".
   * Esto evita que estilos de posicionamiento u otros lleguen al botón.
   */
  getProductColor(colorStyle: string): string {
    if (!colorStyle) return '';
    // Si viene con "background-color:", extrae solo el valor
    const match = colorStyle.match(/background-color\s*:\s*([^;]+)/i);
    if (match) return match[1].trim();
    // Si viene como color directo (ej: "#FF0000" o "red"), retornarlo tal cual
    return colorStyle.trim();
  }


  private getMozoByMozoId(idMozo: number): Empleado | undefined {
    return this.listEmpleados.find(Mozo => idMozo === Mozo.IdEmpleado);
  }

  private getTotalByListProductGrid(): number {

    var cantidad: number = 0;

    this.listProductGrid.forEach(productGrid => {
      cantidad = cantidad + productGrid.Subtotal;
    });

    return cantidad;
  }

  private limpiarPedido(): void {
    this.listProductGrid = [];
    this.actualizarDatosGrilla();
    this.gridListaPedidoDetProducto.data = [];
    this.mozoSelected = new Empleado;
    this.espacioSelected = new Espacios;
    this.procesarPedido = false;
    this.idPedidoCobrar = 0;
    this.nroCuentaCobrar = 0;
    this.horaPedido = '';
    this.nombreCuenta = '';
    this.espacioSelected.NroPersonas = 0;
    this.clienteSelected = new Cliente;
    this.socioNegocioSelected = new SocioNegocio;
  }


  private getPedidoDetByResponse(listData: PedidoEspacioDTO[]): PedidoDet[] {

    var oPedidoDet: PedidoDet;
    var result: PedidoDet[] = [];
    listData.forEach(data => {
      oPedidoDet = new PedidoDet(
        {
          Item: data.Item,
          NroCuenta: data.NroCuenta,
          NombreCuenta: data.NombreCuenta,
          IdPedido: data.IdPedido,
          Producto: new Producto({
            IdProducto: data.IdProducto,
            NombreCorto: data.NombreCorto,
            ExclusivoParaAnfitriona: data.ExclusivoParaAnfitriona,
            Qty: data.Qty,
            FactorComplemento: data.FactorComplemento,
            PermitirParaTragoCortesia: data.PermitirParaTragoCortesia
          }),
          Precio: data.Precio,
          Cantidad: data.Cantidad,
          Subtotal: data.Subtotal,
          Anfitriona: data.Anfitriona,
          Observacion: data.Observacion,
          Impuesto1: data.Impuesto1,
          MontoDescuento: data.MontoDescuento,
          NroCupon: data.NroCupon,
          Ip: data.Ip,
          PedidoComplemento: data.PedidoComplemento
        }
      );
      result.push(oPedidoDet);
    });

    return result;
  }

  private rellenarHeaderPedido(listData: PedidoEspacioDTO[]): void {
    var firstItem = listData[0];
    this.espacioSelected.NroPersonas = firstItem.NroPax;
    this.mozoSelected = this.getMozoByMozoId(firstItem.IdEmpleado);
    this.clienteSelected.RazonSocial = firstItem.Cliente;
    this.idPedidoCobrar = firstItem.IdPedido;
    this.nroCuentaCobrar = firstItem.NroCuenta;
    this.horaPedido = firstItem.HoraPedido;
    this.numeroPedido = firstItem.NroPedido;
  }

  async Refresh(): Promise<void> {
    try {
      this.spinnerService.show();

      // Ejecutar las solicitudes en paralelo
      const [productsData, espaciosData, pedidoResponse] = await Promise.all([
        lastValueFrom(this.productService.getAllProductosTablero()),
        lastValueFrom(this.espaciosService.GetAllEspaciosConPedidos()),
        lastValueFrom(this.pedidoService.ObtenerPedidosByIdTurno(this.turnoAbierto.IdTurno))
      ]);

      // Actualizar los datos con los resultados obtenidos
      this.listProducts = productsData.Data;
      this.listaEspaciosTotal = espaciosData.Data;

      if (pedidoResponse.Success) {
        this.listaPedidosPendientes = pedidoResponse.Data;
      }

      // Mostrar las espacios en el ambiente correspondiente
      const result = this.listAmbiente.find(item => item.Estado == 1);
      if (result) this.MostrarEspacios_x_Ambiente(result);

    } catch (error) {
      console.error('Error al refrescar los datos', error);
      // Aquí podrías manejar el error y mostrar un mensaje al usuario si es necesario
    } finally {
      this.spinnerService.hide();  // Ocultar el spinner al finalizar
    }
  }


  RehacerRefresh(): void {

    try {
      this.spinnerService.show();

      if (this.RehacerPantallaRefresh === 'Refresh') {
        this.Refresh();
      }
      if (this.RehacerPantallaRefresh === 'RehacerPantalla') {
        this.RehacerPantalla();
      }
    } catch (error) {

    } finally {
      this.spinnerService.hide();
    }
  }

  OpenDialogDocumentosEmitidos(): void {
  
    const idTurno: number = this.turnoAbierto.IdTurno;
    const dialogDocumentosEmitidosComponent = this.dialog.open(DialogDocumentosEmitidosComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '1060px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { idTurno, idCaja: this.turnoAbierto.IdCaja }
    });
    

    dialogDocumentosEmitidosComponent.afterClosed().subscribe(Resultado => {
   })

}

  OpenDialogEmitirComprobante(idTipoDoc: EnumTipoDocumento): void {
    

       const dialogEmitirComprobanteComponent = this.dialog.open(DialogEmitirComprobanteComponent, {
         disableClose: true,
         hasBackdrop: true,
         width: '900px',
         maxWidth: '95vw',
         data: { lblcambio: this.turnoAbierto.TipoCambioVenta, 
                 dblImporte: this.sumaImporte,
                 dblDscto: this.sumaDscto,
                 dblTotal: this.sumaTotal,
                 dblGranTotal: this.sumaGranTotal,
                 idPedidoCobrar: this.idPedidoCobrar,
                 nroCuentaCobrar: this.nroCuentaCobrar, 
                 idTipoPedido: this.idCanalVentaSelected, 
                 idTipoDoc: idTipoDoc,
                 pedidoCab: null,
                 bTurnoIndenpendiente: false,
                 idCaja:this.turnoAbierto.IdCaja,
                 idTurno: this.turnoAbierto.IdTurno
               }
       });
       

       dialogEmitirComprobanteComponent.afterClosed().subscribe(Resultado => {
        this.RehacerPantalla();
      })
 
  }
}