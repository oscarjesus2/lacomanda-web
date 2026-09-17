import { Component, OnDestroy } from '@angular/core';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { EntradasEmitidasService } from 'src/app/services/entradasemitidas.service';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { StorageService } from 'src/app/services/storage.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import Swal from 'sweetalert2';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';
import { Usuario } from 'src/app/models/usuario.models';
import { PedidoCab } from 'src/app/models/pedido.models';
import { PedidoDet } from 'src/app/models/pedidodet.models';
import { TurnoService } from 'src/app/services/turno.service';
import { Turno } from 'src/app/models/turno.models';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { Producto } from 'src/app/models/product.models';
import { DescuentoCodigo } from 'src/app/models/descuentocodigo.models';
import { DialogEmitirComprobanteComponent } from '../dialog-emitir-comprobante/dialog-emitir-comprobante.component';
import { CanalVentaEnum, EnumTipoDocumento, NivelUsuarioEnum } from 'src/app/enums/enum';
import { DialogPagarTaxistaComponent } from '../dialog-pagar-taxista/dialog-pagar-taxista.component';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { ProductoService } from 'src/app/services/product.service';
import { EntradaProducto } from 'src/app/interfaces/entradaProducto.interface';
import { SolicitudAutorizacionService } from 'src/app/services/solicitud-autorizacion.service';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import {
  SolicitudAutorizacion,
  SolicitudAutorizacionCreada,
  autorizacionDisponible,
} from 'src/app/models/solicitud-autorizacion.models';
import { Notificar } from 'src/app/shared/notificaciones';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dialog-entradas',
  templateUrl: './dialog-entradas.component.html',
  styleUrls: ['./dialog-entradas.component.css']
})
export class DialogEntradasComponent implements OnDestroy {
  turnoAbierto: Turno;
  tragosGratis = 0;
  entradaSocios = 0;
  entradaInvitados = 0;
  entradaGratis = 0;
  entradaConsumo = 0;
  entradaXConsumo = 0;
  entradaNacional = 0;
  entradaInternacional = 0;

  selectedButton: string | null = null;
  descuentoNacional: number = 0;
  descuentoInternacional: number = 0;
  nuevoPrecioNacional: any;
  nuevoPrecioInternacional: any;
  total: number = 0;
  descuentoTotal: number = 0;
  subTotal: number = 0;
  monedaSimbolo: string = '';

  // Productos de entrada traídos del backend (ya no en duro).
  prodNacional?: EntradaProducto;
  prodInternacional?: EntradaProducto;

  get precioNacional(): number { return this.prodNacional?.Precio ?? 0; }
  get precioInternacional(): number { return this.prodInternacional?.Precio ?? 0; }
  get idProductoNacional(): number { return Number(this.prodNacional?.IdProducto ?? 0); }
  get idProductoInternacional(): number { return Number(this.prodInternacional?.IdProducto ?? 0); }

  iIdUsuarioNacionalAdmin: any;
  iIdUsuarioInterNacionalAdmin: any;
  vinoConTaxista: boolean = false;
  /** Administrador, o cajero con el permiso "Permitir aplicar descuentos". */
  puedeAplicarDescuento = false;
  /** Autorizaciones aprobadas y sin usar, por producto de entrada. */
  private autorizacionesDescuento = new Map<number, SolicitudAutorizacion>();
  /** Autorización aprobada y sin usar para emitir entradas gratis. */
  private autorizacionEntradasGratis?: SolicitudAutorizacion;
  private autorizacionesSubscription = new Subscription();

  constructor(
    public dialogRef: MatDialogRef<DialogEntradasComponent>,
    private router: Router,
    private storageService: StorageService,
    private entradasemitidasService: EntradasEmitidasService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private TurnoService: TurnoService,
    private spinnerService: NgxSpinnerService,
    private configuracionService: ConfiguracionService,
    private monedaService: MonedaService,
    private productoService: ProductoService,
    private qzTrayService: QzTrayV224Service,
    private solicitudAutorizacionService: SolicitudAutorizacionService,
    private solicitudesAutorizacionRealtime: SolicitudesAutorizacionRealtimeService) {

  }

  ngOnDestroy(): void {
    this.autorizacionesSubscription.unsubscribe();
  }

  /**
   * Autorizaciones propias vigentes: al volver a abrir la caja, un descuento ya
   * aprobado sigue disponible.
   */
  private async cargarMisAutorizaciones(): Promise<void> {
    try {
      const mias = await firstValueFrom(this.solicitudAutorizacionService.listarMisAutorizaciones());
      mias.filter(autorizacionDisponible).forEach(s => this.guardarAutorizacion(s));
    } catch {
      // Sin autorizaciones recuperadas se sigue pudiendo pedir de nuevo.
    }
  }

  /** Mantiene al día las autorizaciones cuando las resuelven mientras la caja está abierta. */
  private escucharAutorizaciones(): void {
    const miUsuario = this.storageService.getCurrentUser()?.IdUsuario;
    this.autorizacionesSubscription.add(
      this.solicitudesAutorizacionRealtime.resuelta$.subscribe(solicitud => {
        if (solicitud.IdUsuarioSolicita !== miUsuario) return;
        if (autorizacionDisponible(solicitud)) {
          this.guardarAutorizacion(solicitud);
        } else {
          this.olvidarAutorizacion(solicitud);
        }
      }),
    );
  }

  private guardarAutorizacion(solicitud: SolicitudAutorizacion): void {
    if (solicitud.Tipo === 'EntradasGratis') {
      this.autorizacionEntradasGratis = solicitud;
      return;
    }

    const idProducto = solicitud.Datos?.IdProducto;
    if (solicitud.Tipo !== 'DescuentoEntrada' || !idProducto) return;

    this.autorizacionesDescuento.set(idProducto, solicitud);
    this.aplicarDescuentoAutorizado(idProducto, Number(solicitud.Datos?.DescuentoUnitario ?? 0));
    this.calcularTotal();
  }

  private olvidarAutorizacion(solicitud: SolicitudAutorizacion): void {
    if (solicitud.Tipo === 'EntradasGratis') {
      if (this.autorizacionEntradasGratis?.IdSolicitud === solicitud.IdSolicitud) {
        this.autorizacionEntradasGratis = undefined;
      }

      return;
    }

    const idProducto = solicitud.Datos?.IdProducto;
    if (!idProducto || this.autorizacionesDescuento.get(idProducto)?.IdSolicitud !== solicitud.IdSolicitud) return;

    this.autorizacionesDescuento.delete(idProducto);
    this.aplicarDescuentoAutorizado(idProducto, 0);
    this.calcularTotal();
  }

  /** Refleja en la pantalla el descuento autorizado (o lo quita con 0). */
  private aplicarDescuentoAutorizado(idProducto: number, descuento: number): void {
    if (idProducto === this.idProductoNacional) {
      this.descuentoNacional = descuento;
      this.nuevoPrecioNacional = descuento > 0 ? this.precioNacional - descuento : 0;
    } else if (idProducto === this.idProductoInternacional) {
      this.descuentoInternacional = descuento;
      this.nuevoPrecioInternacional = descuento > 0 ? this.precioInternacional - descuento : 0;
    }
  }

  /** Pide autorización para rebajar una entrada. */
  private async solicitarDescuentoEntrada(idProducto: number, descuento: number): Promise<void> {
    try {
      const creada = await firstValueFrom(this.solicitudAutorizacionService.solicitarDescuentoEntrada({
        IdCaja: this.turnoAbierto.IdCaja,
        IdProducto: idProducto,
        DescuentoUnitario: descuento,
        Motivo: null,
        IdentificadorEstacion: this.storageService.getCurrentIP() || null,
      }));
      this.avisarSolicitudEnviada(creada);
    } catch {
      // El interceptor ya mostró el motivo (p. ej. ya hay una pendiente).
    }
  }

  private avisarSolicitudEnviada(creada: SolicitudAutorizacionCreada): void {
    const sinAprobadores = creada.AprobadoresConectados === 0;
    Notificar.informacion(
      'Solicitud enviada',
      sinAprobadores
        ? 'No hay administradores conectados ahora. La solicitud quedará pendiente y la verán al ingresar.'
        : creada.Solicitud.Descripcion,
      sinAprobadores ? 'warning' : 'info',
    );
  }

  /** Carga los productos de entrada (precio, id, nombre) desde el backend. */
  private loadEntradas(): void {
    this.productoService.getEntradas().subscribe({
      next: (lista) => {
        const arr = lista ?? [];
        this.prodNacional = arr.find(e => e.TipoEntrada === 'NACIONAL');
        this.prodInternacional = arr.find(e => e.TipoEntrada === 'INTERNACIONAL');
        // El símbolo de estos productos manda para los importes mostrados.
        const simbolo = this.prodNacional?.SimboloMoneda || this.prodInternacional?.SimboloMoneda;
        if (simbolo) { this.monedaSimbolo = simbolo; }
      },
      error: () => {}
    });
  }

  /** Carga el símbolo de moneda desde la configuración central. */
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

  mensajeTaxista: string = "Usted esta indicando que el cliente NO vino con taxista"; // Mensaje inicial

  onTaxistaChange() {
    if (this.vinoConTaxista) {
      this.mensajeTaxista = "Usted esta indicando que el cliente SI vino con taxista";
    } else {
      this.mensajeTaxista = "Usted esta indicando que el cliente NO vino con taxista";
    }
  }
  /** Consulta el permiso en el backend (no en la sesión guardada, que puede estar desactualizada). */
  private loadPermisoDescuento(): void {
    this.usuarioService.getUsuarioActual().subscribe({
      next: (response) => {
        this.puedeAplicarDescuento = response?.Data?.IdNivel === NivelUsuarioEnum.Administrador
          || !!response?.Data?.PuedeAplicarDescuento;
      },
      error: () => { this.puedeAplicarDescuento = false; }
    });
  }

  async ngOnInit() {

    this.loadMoneda();
    this.loadEntradas();
    this.loadPermisoDescuento();
    void this.cargarMisAutorizaciones();
    this.escucharAutorizaciones();
    this.spinnerService.show();

    try {
      // Primer servicio que necesita ejecutarse antes de otros
      this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
        if (data?.Data != null) {
          this.turnoAbierto = data.Data;
          this.spinnerService.hide();
        } else {
          // Si no hay turno abierto
          this.spinnerService.hide();
          Swal.fire({
            icon: 'warning',
            title: 'No hay un turno abierto para esta estación',
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


  // Método para seleccionar el botón e incrementar la cantidad
  selectAndIncrement(tipo: string) {
    this.selectedButton = tipo;
    this.increment(tipo);
  }

  select(tipo: string) {
    this.selectedButton = tipo;
  }

  // Incrementa las entradas
  increment(tipo: string) {
    switch (tipo) {
      case 'socios':
        this.entradaSocios++;
        break;
      case 'invitados':
        this.entradaInvitados++;
        break;
      case 'consumo':
        this.entradaConsumo++;
        break;
      case 'nacional':
        this.entradaNacional++;
        break;
      case 'internacional':
        this.entradaInternacional++;
        break;
    }
    this.calcularTotal();
  }

  // Procesa entradas por consumo
  procesarEntradaXConsumo() {
    console.log(`Procesando ${this.entradaConsumo} entradas por consumo.`);
  }

  // Descontar precio (aplica el descuento)
  descontarEntrada(tipo: string) {
    if (tipo === 'nacional' && this.entradaNacional > 0) {
      this.aplicarDescuentoNacional();
    } else if (tipo === 'internacional' && this.entradaInternacional > 0) {
      this.aplicarDescuentoInternacional();
    }
  }


  async aplicarDescuentoNacional() {
    try {
      const result = await this.dialog.open(DialogMCantComponent, {
        data: { title: 'Descuento Entrada Nacional' }
      }).afterClosed().toPromise();
      const descuento = Number(result?.value ?? 0);

      if (!this.puedeAplicarDescuento) {
        if (descuento > 0) {
          await this.solicitarDescuentoEntrada(this.idProductoNacional, descuento);
        }

        return;
      }

      if (descuento <= 0) {
        this.descuentoNacional = 0;
        this.nuevoPrecioNacional = 0;
      } else {
        this.iIdUsuarioNacionalAdmin = this.storageService.getCurrentUser().IdUsuario;
        this.descuentoNacional = descuento;
        this.nuevoPrecioNacional = this.precioNacional - this.descuentoNacional;
      }

      this.calcularTotal();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  async aplicarDescuentoInternacional() {
    try {
      const result = await this.dialog.open(DialogMCantComponent, {
        data: { title: 'Descuento Entrada Internacional' }
      }).afterClosed().toPromise();
      const descuento = Number(result?.value ?? 0);

      if (!this.puedeAplicarDescuento) {
        if (descuento > 0) {
          await this.solicitarDescuentoEntrada(this.idProductoInternacional, descuento);
        }

        return;
      }

      if (descuento <= 0) {
        this.descuentoInternacional = 0;
        this.nuevoPrecioInternacional = 0;
      } else {
        this.iIdUsuarioInterNacionalAdmin = this.storageService.getCurrentUser().IdUsuario;
        this.descuentoInternacional = descuento;
        this.nuevoPrecioInternacional = this.precioInternacional - this.descuentoInternacional;
      }

      this.calcularTotal();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  async avisarSinPermisoDescuento() {
    // El backend también valida el permiso al emitir el comprobante.
    await Swal.fire({
      title: 'Seguridad',
      text: 'No tienes permiso para aplicar descuentos. Solicita a un administrador que te lo conceda.',
      icon: 'info',
      confirmButtonText: 'OK'
    });
  }


  // Restar cantidad de cualquier entrada seleccionada
  restarCantidad() {
    switch (this.selectedButton) {
      case 'socios':
        if (this.entradaSocios > 0) this.entradaSocios--;
        break;
      case 'invitados':
        if (this.entradaInvitados > 0) this.entradaInvitados--;
        break;
      case 'consumo':
        if (this.entradaConsumo > 0) this.entradaConsumo--;
        break;
      case 'nacional':
        if (this.entradaNacional > 0) this.entradaNacional--;
        break;
      case 'internacional':
        if (this.entradaInternacional > 0) this.entradaInternacional--;
        break;
    }
    this.calcularTotal();
  }

  // Limpiar todas las entradas
  limpiar() {
    this.entradaSocios = 0;
    this.entradaInvitados = 0;
    this.entradaGratis = 0;
    this.entradaConsumo = 0;
    this.entradaNacional = 0;
    this.entradaInternacional = 0;
    this.descuentoNacional = 0;
    this.descuentoInternacional = 0;
    this.selectedButton = null;
    this.nuevoPrecioInternacional=0;
    this.nuevoPrecioNacional=0;
    this.vinoConTaxista=false;
    this.calcularTotal();
  }

  TipoDocumento = EnumTipoDocumento;
  aceptar(idTipoDoc: EnumTipoDocumento) {
    try {
      // Validación de entradas
      const totalEntradas = this.entradaNacional + this.entradaInternacional;
      if (totalEntradas <= 0) {
        Swal.fire('Validación', 'No ha ingresado ninguna cantidad de Entradas.', 'warning');
        return;
      }

      if (totalEntradas < this.tragosGratis) {
        Swal.fire('Validación', 'No puede ingresar más códigos promocionales.', 'warning');
        this.tragosGratis = totalEntradas; // Ajustar los tragos gratis
        return;
      }

      if (this.tragosGratis === 0) {
        Swal.fire({
          title: 'Venta de Entradas',
          text: 'No ha ingresado un código gratuito. ¿Desea continuar con la venta?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí',
          cancelButtonText: 'No',
        }).then((result) => {
          if (result.isDismissed) {
            return;
          }
          this.procesarVenta(idTipoDoc);
        });
      } else {
        this.procesarVenta(idTipoDoc);
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  procesarPagoTaxista(){
    const dialogPagarTaxistaComponent = this.dialog.open(DialogPagarTaxistaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '850px', // Establece el ancho del diálogo
      // Sin alto fijo: el diálogo se ajusta al contenido (el surface ya limita
      // la altura al viewport) para que el botón "Pagar Taxista" siempre se vea.
    });

    dialogPagarTaxistaComponent.afterClosed().subscribe(Resultado => {

    })
    
  }

  procesarVenta(idTipoDoc: EnumTipoDocumento) {


    const pedidoCab: PedidoCab = new PedidoCab();
    const oListaPedidoDet: PedidoDet[] = [];
    pedidoCab.IdEmpleado = this.storageService.getCurrentUser().IdEmpleado;
    pedidoCab.Direccion = "";
    pedidoCab.Referencia = "";
    pedidoCab.Cliente = "";
    pedidoCab.IdPedido = 0;
    pedidoCab.NroCuenta = 1;
    pedidoCab.NroPedido = 0;
    pedidoCab.Total = this.total;
    pedidoCab.IdCanalVenta = CanalVentaEnum.ENTRADAS;
    pedidoCab.Estado = 1;
    pedidoCab.Moneda = "SOL";
    pedidoCab.IdEspacio = 9999;
    pedidoCab.IdCaja = this.turnoAbierto.IdCaja; //esto debe asignarse en el backend
    pedidoCab.NumPrecuentas = 0;
    pedidoCab.FechaPrecuenta = null;
    pedidoCab.EspacioPrecuenta = null;
    pedidoCab.Observacion = '';
    pedidoCab.Dscto = this.descuentoTotal;
    pedidoCab.Importe = this.subTotal;
    pedidoCab.UsuReg = this.storageService.getCurrentSession().User.IdUsuario;
    pedidoCab.UsuMod = this.storageService.getCurrentSession().User.IdUsuario;
    pedidoCab.IdTurno = this.turnoAbierto.IdTurno;


    if (this.entradaNacional > 0) {
      const oPedidoDetNacional: PedidoDet = new PedidoDet();

      oPedidoDetNacional.IdPedido = 0;
      oPedidoDetNacional.NroCuenta = 1;
      oPedidoDetNacional.Producto = new Producto({ IdProducto: this.idProductoNacional });
      oPedidoDetNacional.Item = 1;
      oPedidoDetNacional.Precio = this.precioNacional;
      oPedidoDetNacional.Cantidad = this.entradaNacional;
      oPedidoDetNacional.Subtotal = this.entradaNacional * this.precioNacional;
      oPedidoDetNacional.Enviado = true;
      oPedidoDetNacional.IdDescuento = this.nuevoPrecioNacional > 0 ? '002' : null;
      oPedidoDetNacional.UsuDescuento = this.nuevoPrecioNacional > 0 ? this.iIdUsuarioNacionalAdmin : null;
      oPedidoDetNacional.MontoDescuento = this.nuevoPrecioNacional > 0 ? this.precioNacional * this.entradaNacional - this.nuevoPrecioNacional * this.entradaNacional : 0;
      oPedidoDetNacional.NroCupon = 'ENTRADA';
      oPedidoDetNacional.Estado = 2;
      oPedidoDetNacional.Ip = this.storageService.getCurrentIP()
      oListaPedidoDet.push(oPedidoDetNacional);
    }

    if (this.entradaInternacional > 0) {
      const oPedidoDetInternacional: PedidoDet = new PedidoDet();

      oPedidoDetInternacional.IdPedido = 0;
      oPedidoDetInternacional.NroCuenta = 1;
      oPedidoDetInternacional.Producto = new Producto({ IdProducto: this.idProductoInternacional });
      oPedidoDetInternacional.Item = 2;
      oPedidoDetInternacional.Precio = this.precioInternacional;
      oPedidoDetInternacional.Cantidad = this.entradaInternacional;
      oPedidoDetInternacional.Subtotal = this.entradaInternacional * this.precioInternacional;
      oPedidoDetInternacional.Enviado = true;
      oPedidoDetInternacional.IdDescuento = this.nuevoPrecioInternacional > 0 ? '002' : null;
      oPedidoDetInternacional.UsuDescuento = this.nuevoPrecioInternacional > 0 ? this.iIdUsuarioInterNacionalAdmin : null;
      oPedidoDetInternacional.MontoDescuento = this.nuevoPrecioInternacional > 0 ? this.precioInternacional * this.entradaInternacional - this.nuevoPrecioInternacional * this.entradaInternacional : 0;
      oPedidoDetInternacional.NroCupon = 'ENTRADA';
      oPedidoDetInternacional.Estado = 2;
      oPedidoDetInternacional.Ip = this.storageService.getCurrentIP()
      oListaPedidoDet.push(oPedidoDetInternacional);
    }

    pedidoCab.ListaPedidoDet = oListaPedidoDet;
    // El backend comprueba y consume estas autorizaciones al grabar la venta.
    pedidoCab.IdsAutorizacionDescuento = oListaPedidoDet
      .map(det => this.autorizacionesDescuento.get(Number(det.Producto?.IdProducto))?.IdSolicitud)
      .filter((id): id is number => !!id);
    // Procesar códigos promocionales (tragos gratis)
    var listaDescuentoCodigo: DescuentoCodigo[] = [];
    for (let i = 1; i <= this.tragosGratis; i++) {
      listaDescuentoCodigo.push({
        Correlativo: 0,
        IdDescuento: '001',
        CodigoPromocional: '',
        Activo: true,
        IdPedido: 0,
        IdVenta: 0,
        UsuReg: this.storageService.getCurrentUser().IdUsuario,
        VinoConTaxista: this.vinoConTaxista,
      });
    }

    const dialogEmitirComprobanteComponent = this.dialog.open(DialogEmitirComprobanteComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
      maxWidth: '95vw',
      data: {
        lblcambio: this.turnoAbierto.TipoCambioVenta,
        dblImporte: this.subTotal,
        dblDscto: this.descuentoTotal,
        dblTotal: this.total,
        dblGranTotal: this.total,
        idPedidoCobrar: 0,
        nroCuentaCobrar: 0,
        idTipoPedido: '004',
        idTipoDoc: idTipoDoc,
        pedidoCab: pedidoCab,
        listaDescuentoCodigo: listaDescuentoCodigo,
        bTurnoIndenpendiente: false,
        idCaja: this.turnoAbierto.IdCaja,
        idTurno: this.turnoAbierto.IdTurno
      }
    });

    dialogEmitirComprobanteComponent.afterClosed().subscribe(resultado => {
      if (resultado.estado === 'Cobrado'){
        const listaImpresionDTO: ImpresionDTO[] =  resultado.listaImpresionDTO; 
        this.procesarEntrada(listaImpresionDTO[0].IdVenta);
        // Reiniciar campos
        this.limpiar();
      }
    })
    
  }

  salir() {
    this.dialogRef.close();
  }
  // Simulación del modal para clave de administrador
  async openClaveAnulaModal() {
    // Simulación: Aquí va la lógica para abrir el modal y esperar la respuesta.
    return new Promise(resolve => {
      resolve({ sRetornaRespuesta: 'Enter', iRetornaUsuarioAdmin: 12345 });
    });
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


  calcularTotal() {
    let dSubTotalNacional = 0, dSubTotalInternacional = 0;
    let dDescuentoNacional = 0, dDescuentoInternacional = 0;
    let dTotalNacional = 0, dTotalInternacional = 0;

    // Cálculo para Nacional
    if (this.descuentoNacional === 0) {
      dSubTotalNacional = this.precioNacional * this.entradaNacional;
      dDescuentoNacional = 0;
      dTotalNacional = dSubTotalNacional;
    } else {
      dSubTotalNacional = this.precioNacional * this.entradaNacional;
      dDescuentoNacional = dSubTotalNacional - (this.nuevoPrecioNacional * this.entradaNacional);
      dTotalNacional = dSubTotalNacional - dDescuentoNacional;
    }

    // Cálculo para Internacional
    if (this.descuentoInternacional === 0) {
      dSubTotalInternacional = this.precioInternacional * this.entradaInternacional;
      dDescuentoInternacional = 0;
      dTotalInternacional = dSubTotalInternacional;
    } else {
      dSubTotalInternacional = this.precioInternacional * this.entradaInternacional;
      dDescuentoInternacional = dSubTotalInternacional - (this.nuevoPrecioInternacional * this.entradaInternacional);
      dTotalInternacional = dSubTotalInternacional - dDescuentoInternacional;
    }

    // Actualizar Tragos Gratis, Subtotal, Descuento y Total
    this.tragosGratis = this.entradaNacional + this.entradaInternacional;
    this.subTotal = dSubTotalNacional + dSubTotalInternacional;
    this.descuentoTotal = dDescuentoNacional + dDescuentoInternacional;
    this.total = dTotalNacional + dTotalInternacional;
  }

  // Función para imprimir las entradas (simulada)
  ImprimirEntrada(correlativo: number) {
    console.log(`Imprimiendo entrada con correlativo: ${correlativo}`);
  }

  async procesarEntrada(idVenta: number) {
    try {
      this.spinnerService.show();
      const entradaNacional = this.entradaNacional;
      const entradaInternacional = this.entradaInternacional;

      if (entradaNacional === 0 && entradaInternacional === 0) {
        return;
      }
  
      // Variables para almacenar todas las entradas
      let impresiones: ImpresionDTO[] = [];
      // Procesar entrada nacional si existe
      if (entradaNacional > 0) {
        let responseNacional: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(entradaNacional, 'NACIONAL', idVenta).toPromise();
        impresiones = impresiones.concat(responseNacional.Data); // Agregar los resultados nacionales
        console.log('nacional ' + impresiones);
      }

      // Procesar entrada internacional si existe
      if (entradaInternacional > 0) {
        let responseInternacional: ApiResponse<ImpresionDTO[]> = await this.entradasemitidasService.procesarEmisionEntradas(entradaInternacional, 'INTERNACIONAL', idVenta).toPromise();
        impresiones = impresiones.concat(responseInternacional.Data); // Agregar los resultados internacionales
        console.log('Internacional ' + impresiones);
      }

      if (impresiones.length > 0) {
        this.imprimir(impresiones);
      }
  
      this.spinnerService.hide();
  
    } catch (error) {
      this.spinnerService.hide();
      await Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  

  async procesarEntradaGratis() {
    try {
      if (this.entradaSocios === 0 && this.entradaInvitados === 0) {
        return;
      }

      // Sin permiso hace falta una autorización aprobada: si no la hay, se pide.
      if (!this.puedeAplicarDescuento) {
        await this.procesarEntradaGratisAutorizada();
        return;
      }

      if (!await this.confirmarEntradasGratis()) return;

      await this.emitirEntradasGratis();
      this.limpiar();
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

  /** Emite con la autorización aprobada, o la pide si todavía no la tiene. */
  private async procesarEntradaGratisAutorizada(): Promise<void> {
    const autorizacion = this.autorizacionEntradasGratis;
    const datos = autorizacion?.Datos;
    const coincide = !!datos
      && Number(datos.Socios ?? 0) === this.entradaSocios
      && Number(datos.Invitados ?? 0) === this.entradaInvitados;

    if (autorizacion && coincide) {
      if (!await this.confirmarEntradasGratis()) return;

      await this.emitirEntradasGratis(autorizacion.IdSolicitud);
      this.autorizacionEntradasGratis = undefined;
      this.limpiar();
      return;
    }

    if (autorizacion) {
      Notificar.informacion(
        'Autorización por otras cantidades',
        `Está autorizado ${datos?.Socios ?? 0} socio(s) y ${datos?.Invitados ?? 0} invitado(s).`,
        'warning',
      );
      return;
    }

    try {
      const creada = await firstValueFrom(this.solicitudAutorizacionService.solicitarEntradasGratis({
        IdCaja: this.turnoAbierto.IdCaja,
        Socios: this.entradaSocios,
        Invitados: this.entradaInvitados,
        Motivo: null,
        IdentificadorEstacion: this.storageService.getCurrentIP() || null,
      }));
      this.avisarSolicitudEnviada(creada);
    } catch {
      // El interceptor ya mostró el motivo.
    }
  }

  private async confirmarEntradasGratis(): Promise<boolean> {
    const confirmResult = await Swal.fire({
      title: 'Está apunto de procesar:',
      html: `
                ${(this.entradaSocios !== 0 ? this.entradaSocios + " Entrada(s) para Socios<br>" : "")}
                ${(this.entradaInvitados !== 0 ? this.entradaInvitados + " Entrada(s) para Invitados<br>" : "")}
                ¿Desea Continuar?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    });

    return !confirmResult.isDismissed;
  }

  private async emitirEntradasGratis(idSolicitudAutorizacion?: number): Promise<void> {
    this.spinnerService.show();
    try {
      const response = await firstValueFrom(this.entradasemitidasService.emitirEntradasGratis(
        this.entradaSocios,
        this.entradaInvitados,
        idSolicitudAutorizacion,
      ));
      await this.imprimir(response.Data ?? []);
    } finally {
      this.spinnerService.hide();
    }
  }
}