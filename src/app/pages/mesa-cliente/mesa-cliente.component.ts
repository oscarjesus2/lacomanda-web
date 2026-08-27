import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  CartaPublicaMesaCliente,
  CartaMesaCliente,
  ComplementoCartaMesaCliente,
  EstadoPagoCuentaMesa,
  EstadoAccesoMesa,
  ItemPedidoMesaCliente,
  MensajeAsistenteCartaMesaCliente,
  ProductoCartaMesaCliente,
  SeccionMenuCartaMesaCliente,
  SolicitudAccesoMesa
} from 'src/app/models/mesa-cliente.models';
import { HeaderService } from 'src/app/services/header.service';
import { MesaClienteSesionRealtimeService } from 'src/app/services/mesa-cliente-sesion-realtime.service';
import { MesaClienteService } from 'src/app/services/mesa-cliente.service';

interface OpcionCantidad {
  IdProducto: number;
  Cantidad: number;
}

interface EditorProducto {
  producto: ProductoCartaMesaCliente;
  cantidad: number;
  observacion: string;
  complementos: OpcionCantidad[];
  opcionesMenu: Array<OpcionCantidad & { IdSeccionMenu: number; Observacion?: string }>;
}

interface LineaCarrito {
  nombre: string;
  precio: number;
  request: ItemPedidoMesaCliente;
}

@Component({
  selector: 'app-mesa-cliente',
  templateUrl: './mesa-cliente.component.html',
  styleUrls: ['./mesa-cliente.component.css']
})
export class MesaClienteComponent implements OnInit, OnDestroy {
  codigoQr = '';
  cartaPublica?: CartaPublicaMesaCliente;
  solicitud?: SolicitudAccesoMesa;
  estado?: EstadoAccesoMesa;
  carta?: CartaMesaCliente;
  categoriaActiva?: number;
  editor?: EditorProducto;
  carrito: LineaCarrito[] = [];
  cargando = true;
  cargandoCarta = false;
  enviandoPedido = false;
  iniciandoPago = false;
  verificandoPago = false;
  pagoCompletado = false;
  estadoPagoTexto = '';
  mostrarCarrito = false;
  mostrarAcceso = false;
  mostrarAsistente = false;
  productoAsistente?: ProductoCartaMesaCliente;
  consultandoAsistente = false;
  preguntaAsistente = '';
  errorAsistente = '';
  historialAsistente: MensajeAsistenteCartaMesaCliente[] = [];
  idsProductosRecomendados: number[] = [];
  private readonly sugerenciasProducto = [
    '¿Qué ingredientes principales tiene?',
    '¿Contiene frutos secos?',
    '¿Es picante?'
  ];
  private readonly sugerenciasGenerales = [
    'Quiero algo ligero, ¿qué me recomiendas?',
    '¿Qué platos son buenos para compartir?',
    'Ayúdame a elegir entre los platos más populares'
  ];
  error = '';
  aviso = '';
  private readonly imagenesProducto = new Map<number, string>();
  private expiracionTimer?: ReturnType<typeof setTimeout>;
  private pagoTimer?: ReturnType<typeof setTimeout>;
  private pagoConsultas = 0;
  private idSesionContextoAsistente?: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly mesaClienteService: MesaClienteService,
    private readonly mesaClienteRealtime: MesaClienteSesionRealtimeService,
    private readonly headerService: HeaderService
  ) {}

  ngOnInit(): void {
    this.headerService.hideHeader();
    this.codigoQr = this.route.snapshot.paramMap.get('codigoQr') || '';
    if (!this.codigoQr) {
      this.cargando = false;
      this.error = 'Este código QR no es válido.';
      return;
    }

    this.cargarCartaPublica();
    const token = sessionStorage.getItem(this.storageKey);
    if (token) {
      this.iniciarConsulta(token);
      this.recuperarPagoPendiente(token);
    }
  }

  ngOnDestroy(): void {
    this.limpiarExpiracion();
    this.limpiarConsultaPago();
    void this.mesaClienteRealtime.detener();
    this.liberarImagenes();
    this.limpiarContextoAsistente();
    this.headerService.showHeader();
  }

  reintentar(): void {
    this.limpiarExpiracion();
    void this.mesaClienteRealtime.detener();
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.paymentStorageKey);
    this.estado = undefined;
    this.solicitud = undefined;
    this.limpiarContextoAsistente();
    this.error = '';
    this.mostrarAcceso = true;
    this.solicitarAcceso();
  }

  solicitarPedido(): void {
    if (this.activa) {
      this.aviso = 'Ya puedes seleccionar productos y enviar tu pedido.';
      window.setTimeout(() => this.aviso = '', 2600);
      return;
    }
    this.mostrarAcceso = true;
    const token = sessionStorage.getItem(this.storageKey);
    token ? this.iniciarConsulta(token) : this.solicitarAcceso();
  }

  seleccionarCategoria(idSubFamilia?: number): void {
    this.categoriaActiva = idSubFamilia;
    this.cargarImagenesProductos();
  }

  editarProducto(producto: ProductoCartaMesaCliente): void {
    this.editor = {
      producto,
      cantidad: 1,
      observacion: '',
      complementos: [],
      opcionesMenu: []
    };
  }

  imagenProducto(idProducto: number): string | undefined {
    return this.imagenesProducto.get(idProducto);
  }

  abrirAsistente(producto: ProductoCartaMesaCliente, event?: Event): void {
    event?.stopPropagation();
    this.productoAsistente = producto;
    this.preguntaAsistente = '';
    this.errorAsistente = '';
    this.mostrarAsistente = true;
  }

  abrirAsistenteGeneral(): void {
    this.productoAsistente = undefined;
    this.preguntaAsistente = '';
    this.errorAsistente = '';
    this.mostrarAsistente = true;
  }

  cerrarAsistente(): void {
    this.mostrarAsistente = false;
    this.errorAsistente = '';
  }

  enviarPreguntaAsistente(sugerencia?: string): void {
    const pregunta = (sugerencia || this.preguntaAsistente).trim();
    if (!pregunta || this.consultandoAsistente) return;

    const historial = this.historialAsistente.slice(-20);
    this.historialAsistente.push({ Rol: 'user', Texto: pregunta });
    this.preguntaAsistente = '';
    this.errorAsistente = '';
    this.consultandoAsistente = true;
    this.mesaClienteService.consultarAsistente(this.codigoQr, {
      IdProducto: this.productoAsistente?.IdProducto,
      Pregunta: pregunta,
      Historial: historial
    }).subscribe({
      next: response => {
        this.consultandoAsistente = false;
        this.historialAsistente.push({
          Rol: 'assistant',
          Texto: response.Data.Respuesta
        });
        if (!this.productoAsistente) {
          this.idsProductosRecomendados = response.Data.IdsProductosRecomendados ?? [];
          if (this.idsProductosRecomendados.length) {
            this.categoriaActiva = undefined;
            this.cargarImagenesProductos();
          }
        }
      },
      error: error => {
        this.consultandoAsistente = false;
        this.errorAsistente = error?.error?.Message
          || 'Ahora mismo no puedo responder. El personal del restaurante podrá ayudarte.';
      }
    });
  }

  cerrarEditor(): void { this.editor = undefined; }

  cambiarCantidadProducto(delta: number): void {
    if (!this.editor) return;
    this.editor.cantidad = Math.max(1, Math.min(50, this.editor.cantidad + delta));
    this.recortarSeleccionesAlLimite();
  }

  cambiarComplemento(complemento: ComplementoCartaMesaCliente, delta: number): void {
    if (!this.editor || delta > 0 && !this.puedeAgregarComplemento(complemento)) return;
    this.cambiarOpcion(this.editor.complementos, complemento.IdProducto, delta);
  }

  cambiarOpcionMenu(
    seccion: SeccionMenuCartaMesaCliente,
    idProducto: number,
    delta: number
  ): void {
    if (!this.editor) return;
    const opciones = this.editor.opcionesMenu;
    const actualSeccion = opciones
      .filter(x => x.IdSeccionMenu === seccion.IdSeccionMenu)
      .reduce((total, x) => total + x.Cantidad, 0);
    const requerido = seccion.Cantidad * this.editor.cantidad;
    if (delta > 0 && actualSeccion >= requerido) return;

    const existente = opciones.find(x =>
      x.IdSeccionMenu === seccion.IdSeccionMenu && x.IdProducto === idProducto);
    if (existente) {
      existente.Cantidad = Math.max(0, existente.Cantidad + delta);
      if (existente.Cantidad === 0) {
        this.editor.opcionesMenu = opciones.filter(x => x !== existente);
      }
    } else if (delta > 0) {
      opciones.push({ IdSeccionMenu: seccion.IdSeccionMenu, IdProducto: idProducto, Cantidad: 1 });
    }
  }

  cantidadComplemento(idProducto: number): number {
    return this.editor?.complementos.find(x => x.IdProducto === idProducto)?.Cantidad || 0;
  }

  cantidadOpcionMenu(idSeccion: number, idProducto: number): number {
    return this.editor?.opcionesMenu.find(x =>
      x.IdSeccionMenu === idSeccion && x.IdProducto === idProducto)?.Cantidad || 0;
  }

  seleccionMenu(seccion: SeccionMenuCartaMesaCliente): number {
    return this.editor?.opcionesMenu
      .filter(x => x.IdSeccionMenu === seccion.IdSeccionMenu)
      .reduce((total, x) => total + x.Cantidad, 0) || 0;
  }

  requeridoMenu(seccion: SeccionMenuCartaMesaCliente): number {
    return seccion.Cantidad * (this.editor?.cantidad || 1);
  }

  puedeAgregarComplemento(complemento: ComplementoCartaMesaCliente): boolean {
    if (!this.editor) return false;
    return this.pesoComplementos + complemento.Factor
      <= this.editor.producto.CantidadComplementos * this.editor.cantidad;
  }

  agregarAlCarrito(): void {
    if (!this.editor || !this.editorValido) return;
    const editor = this.editor;
    this.carrito.push({
      nombre: editor.producto.Nombre,
      precio: editor.producto.Precio,
      request: {
        IdProducto: editor.producto.IdProducto,
        Cantidad: editor.cantidad,
        Observacion: editor.observacion.trim(),
        Complementos: editor.complementos.map(x => ({ ...x })),
        OpcionesMenu: editor.opcionesMenu.map(x => ({ ...x }))
      }
    });
    this.editor = undefined;
    this.aviso = 'Producto añadido al pedido.';
    window.setTimeout(() => this.aviso = '', 2200);
  }

  quitarLinea(indice: number): void {
    this.carrito.splice(indice, 1);
    if (this.carrito.length === 0) this.mostrarCarrito = false;
  }

  enviarPedido(): void {
    const token = sessionStorage.getItem(this.storageKey);
    if (!token || this.carrito.length === 0 || this.enviandoPedido) return;

    this.enviandoPedido = true;
    this.error = '';
    this.mesaClienteService.registrarPedido(token, {
      Items: this.carrito.map(x => x.request)
    }).subscribe({
      next: response => {
        this.enviandoPedido = false;
        this.carrito = [];
        this.mostrarCarrito = false;
        this.aviso = `Pedido ${response.Data.IdPedido} enviado a preparación.`;
      },
      error: error => {
        this.enviandoPedido = false;
        this.error = error?.error?.Message
          || error?.error?.Data
          || 'No pudimos enviar el pedido. Inténtalo nuevamente.';
      }
    });
  }

  pagarCuenta(): void {
    const token = sessionStorage.getItem(this.storageKey);
    if (!token || !this.puedePagarCuenta || this.iniciandoPago) return;

    this.iniciandoPago = true;
    this.error = '';
    this.mesaClienteService.crearCheckout(token, window.location.href).subscribe({
      next: response => {
        this.iniciandoPago = false;
        sessionStorage.setItem(this.paymentStorageKey, response.Data.IdIntento);
        window.location.assign(response.Data.UrlPago);
      },
      error: error => {
        this.iniciandoPago = false;
        this.error = error?.error?.Message
          || error?.error?.Data
          || 'No pudimos abrir el pago seguro. Inténtalo nuevamente.';
      }
    });
  }

  get pendiente(): boolean {
    return (this.estado?.Estado || this.solicitud?.Estado) === 'Pendiente';
  }

  get activa(): boolean { return this.estado?.Estado === 'Activa'; }

  get puedePagarCuenta(): boolean {
    return this.activa
      && this.estado?.PuedePagarCuentaOnline === true
      && !!this.estado?.IdPedido
      && !this.pagoCompletado;
  }

  get finalizada(): boolean {
    return ['Rechazada', 'Expirada', 'Cerrada'].includes(this.estado?.Estado || '');
  }

  get nombreEspacio(): string {
    const origen = this.estado || this.solicitud || this.cartaPublica;
    return origen ? `${origen.Espacio} ${origen.Numero}` : '';
  }

  get cartaDisponible(): boolean { return !!this.carta; }

  get productosVisibles(): ProductoCartaMesaCliente[] {
    let productos = this.carta?.Productos || [];
    if (this.idsProductosRecomendados.length) {
      const recomendados = new Set(this.idsProductosRecomendados);
      productos = productos.filter(x => recomendados.has(x.IdProducto));
    }
    return this.categoriaActiva
      ? productos.filter(x => x.IdSubFamilia === this.categoriaActiva)
      : productos;
  }

  get sugerenciasAsistente(): string[] {
    return this.productoAsistente ? this.sugerenciasProducto : this.sugerenciasGenerales;
  }

  limpiarRecomendaciones(): void {
    this.idsProductosRecomendados = [];
    this.categoriaActiva = undefined;
    this.cargarImagenesProductos();
  }

  get totalCarrito(): number {
    return this.carrito.reduce((total, x) => total + x.precio * x.request.Cantidad, 0);
  }

  get unidadesCarrito(): number {
    return this.carrito.reduce((total, x) => total + x.request.Cantidad, 0);
  }

  get pesoComplementos(): number {
    if (!this.editor) return 0;
    return this.editor.complementos.reduce((total, seleccion) => {
      const complemento = this.carta?.Complementos
        .find(x => x.IdProducto === seleccion.IdProducto);
      return total + (complemento?.Factor || 0) * seleccion.Cantidad;
    }, 0);
  }

  get editorValido(): boolean {
    if (!this.editor) return false;
    return this.editor.producto.SeccionesMenu.every(
      seccion => this.seleccionMenu(seccion) === this.requeridoMenu(seccion));
  }

  private solicitarAcceso(): void {
    if (this.pendiente) return;
    this.cargando = true;
    this.mesaClienteService.solicitar(this.codigoQr).subscribe({
      next: response => {
        this.cargando = false;
        this.solicitud = response.Data;
        sessionStorage.setItem(this.storageKey, response.Data.Token);
        this.iniciarConsulta(response.Data.Token);
      },
      error: error => {
        this.cargando = false;
        this.error = error?.error?.Message || 'No pudimos abrir este espacio. Solicita ayuda al personal.';
      }
    });
  }

  private iniciarConsulta(token: string): void {
    this.consultarEstado(token, true);
  }

  private consultarEstado(token: string, conectarTiempoReal = false): void {
    this.mesaClienteService.consultar(token).subscribe({
      next: response => {
        this.cargando = false;
        if (this.idSesionContextoAsistente !== undefined
          && this.idSesionContextoAsistente !== response.Data.IdSesion) {
          this.limpiarContextoAsistente();
        }
        this.idSesionContextoAsistente = response.Data.IdSesion;
        this.estado = response.Data;

        if (this.pendiente) {
          this.programarExpiracion(token);
          if (conectarTiempoReal) {
            this.mesaClienteRealtime.iniciar(
              this.estado.IdSesion,
              token,
              () => this.consultarEstado(token),
              () => this.consultarEstado(token)
            );
          }
          return;
        }

        this.limpiarExpiracion();
        void this.mesaClienteRealtime.detener();
        if (this.estado.Estado === 'Activa' && !this.carta && !this.cargandoCarta) {
          this.cargarCarta(token);
        }
      },
      error: error => {
        this.limpiarExpiracion();
        void this.mesaClienteRealtime.detener();
        this.cargando = false;
        sessionStorage.removeItem(this.storageKey);
        this.limpiarContextoAsistente();
        this.error = error?.error?.Message || 'La solicitud dejó de estar disponible.';
      }
    });
  }

  private recuperarPagoPendiente(token: string): void {
    const idIntento = sessionStorage.getItem(this.paymentStorageKey);
    if (!idIntento) return;

    this.verificandoPago = true;
    this.estadoPagoTexto = 'Estamos confirmando el pago con el banco…';
    this.pagoConsultas = 0;
    this.consultarEstadoPago(token, idIntento);
  }

  private consultarEstadoPago(token: string, idIntento: string): void {
    this.limpiarConsultaPago();
    this.mesaClienteService.consultarPago(token, idIntento).subscribe({
      next: response => this.procesarEstadoPago(token, response.Data),
      error: error => {
        if (++this.pagoConsultas < 100) {
          this.pagoTimer = setTimeout(
            () => this.consultarEstadoPago(token, idIntento),
            3000
          );
          return;
        }

        this.verificandoPago = false;
        this.error = error?.error?.Message
          || 'No pudimos confirmar el pago. Si ya pagaste, solicita ayuda al personal.';
      }
    });
  }

  private procesarEstadoPago(token: string, pago: EstadoPagoCuentaMesa): void {
    if (pago.Estado === 'Aplicado') {
      this.verificandoPago = false;
      this.pagoCompletado = true;
      this.estadoPagoTexto = 'Pago confirmado. Tu cuenta ha quedado cerrada correctamente.';
      sessionStorage.removeItem(this.paymentStorageKey);
      sessionStorage.removeItem(this.storageKey);
      this.carrito = [];
      this.mostrarCarrito = false;
      this.limpiarContextoAsistente();
      return;
    }

    if (['Fallido', 'Expirado', 'Cancelado'].includes(pago.Estado)) {
      this.verificandoPago = false;
      sessionStorage.removeItem(this.paymentStorageKey);
      this.error = pago.Estado === 'Cancelado'
        ? 'El pago fue cancelado. Puedes volver a intentarlo cuando quieras.'
        : 'El pago no pudo completarse. No se realizó ningún cobro confirmado.';
      return;
    }

    this.verificandoPago = true;
    this.estadoPagoTexto = pago.Estado === 'Pagado'
      ? 'Pago recibido. Estamos cerrando tu cuenta…'
      : 'Estamos confirmando el pago con el banco…';
    if (++this.pagoConsultas < 200) {
      this.pagoTimer = setTimeout(
        () => this.consultarEstadoPago(token, pago.IdIntento),
        3000
      );
      return;
    }

    this.verificandoPago = false;
    this.error = 'La confirmación está tardando más de lo habitual. Si ya pagaste, solicita ayuda al personal.';
  }

  private limpiarContextoAsistente(): void {
    this.historialAsistente = [];
    this.idsProductosRecomendados = [];
    this.productoAsistente = undefined;
    this.preguntaAsistente = '';
    this.errorAsistente = '';
    this.mostrarAsistente = false;
    this.idSesionContextoAsistente = undefined;
  }

  private limpiarConsultaPago(): void {
    if (!this.pagoTimer) return;
    clearTimeout(this.pagoTimer);
    this.pagoTimer = undefined;
  }

  private programarExpiracion(token: string): void {
    this.limpiarExpiracion();
    const expiraUtc = this.estado?.ExpiraUtc || this.solicitud?.ExpiraUtc;
    const espera = expiraUtc ? new Date(expiraUtc).getTime() - Date.now() : 0;
    if (espera <= 0) return;

    this.expiracionTimer = setTimeout(
      () => this.consultarEstado(token),
      espera + 250
    );
  }

  private limpiarExpiracion(): void {
    if (!this.expiracionTimer) return;
    clearTimeout(this.expiracionTimer);
    this.expiracionTimer = undefined;
  }

  private cargarCarta(token: string): void {
    this.cargandoCarta = true;
    this.mesaClienteService.consultarCarta(token).subscribe({
      next: response => {
        this.cargandoCarta = false;
        this.carta = response.Data;
        this.categoriaActiva = response.Data.Categorias[0]?.IdSubFamilia;
      },
      error: error => {
        this.cargandoCarta = false;
        this.error = error?.error?.Message || 'No pudimos cargar la carta.';
      }
    });
  }

  private cargarCartaPublica(): void {
    this.cargandoCarta = true;
    this.mesaClienteService.consultarCartaPublica(this.codigoQr).subscribe({
      next: response => {
        this.cargando = false;
        this.cargandoCarta = false;
        this.cartaPublica = response.Data;
        this.carta = response.Data.Carta;
        this.categoriaActiva = response.Data.Carta.Categorias[0]?.IdSubFamilia;
        this.cargarImagenesProductos();
      },
      error: error => {
        this.cargando = false;
        this.cargandoCarta = false;
        this.error = error?.error?.Message
          || 'No pudimos abrir la carta de este restaurante.';
      }
    });
  }

  private cargarImagenesProductos(): void {
    const productos = this.carta?.Productos.filter(x =>
      x.TieneImagen &&
      (!this.categoriaActiva || x.IdSubFamilia === this.categoriaActiva)
    ) || [];
    for (const producto of productos) {
      if (this.imagenesProducto.has(producto.IdProducto)) continue;
      this.mesaClienteService.obtenerImagenProducto(this.codigoQr, producto.IdProducto).subscribe({
        next: imagen => this.imagenesProducto.set(
          producto.IdProducto,
          URL.createObjectURL(imagen)
        ),
        error: () => {}
      });
    }
  }

  private liberarImagenes(): void {
    for (const imagen of this.imagenesProducto.values()) URL.revokeObjectURL(imagen);
    this.imagenesProducto.clear();
  }

  private cambiarOpcion(opciones: OpcionCantidad[], idProducto: number, delta: number): void {
    const existente = opciones.find(x => x.IdProducto === idProducto);
    if (existente) {
      existente.Cantidad = Math.max(0, existente.Cantidad + delta);
      if (existente.Cantidad === 0 && this.editor) {
        this.editor.complementos = opciones.filter(x => x !== existente);
      }
    } else if (delta > 0) {
      opciones.push({ IdProducto: idProducto, Cantidad: 1 });
    }
  }

  private recortarSeleccionesAlLimite(): void {
    if (!this.editor) return;
    for (const seccion of this.editor.producto.SeccionesMenu) {
      let exceso = this.seleccionMenu(seccion) - this.requeridoMenu(seccion);
      for (const opcion of this.editor.opcionesMenu
        .filter(x => x.IdSeccionMenu === seccion.IdSeccionMenu)
        .reverse()) {
        if (exceso <= 0) break;
        const quitar = Math.min(exceso, opcion.Cantidad);
        opcion.Cantidad -= quitar;
        exceso -= quitar;
      }
    }
    this.editor.opcionesMenu = this.editor.opcionesMenu.filter(x => x.Cantidad > 0);

    while (this.editor.complementos.length > 0
      && this.pesoComplementos > this.editor.producto.CantidadComplementos * this.editor.cantidad) {
      this.editor.complementos.pop();
    }
  }

  private get storageKey(): string { return `lacomanda-mesa-${this.codigoQr}`; }

  private get paymentStorageKey(): string { return `lacomanda-pago-mesa-${this.codigoQr}`; }
}
