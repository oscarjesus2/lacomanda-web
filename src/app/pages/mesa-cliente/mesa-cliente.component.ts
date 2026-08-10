import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  CartaMesaCliente,
  ComplementoCartaMesaCliente,
  EstadoAccesoMesa,
  ItemPedidoMesaCliente,
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
  solicitud?: SolicitudAccesoMesa;
  estado?: EstadoAccesoMesa;
  carta?: CartaMesaCliente;
  categoriaActiva?: number;
  editor?: EditorProducto;
  carrito: LineaCarrito[] = [];
  cargando = true;
  cargandoCarta = false;
  enviandoPedido = false;
  mostrarCarrito = false;
  error = '';
  aviso = '';
  private expiracionTimer?: ReturnType<typeof setTimeout>;

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

    const token = sessionStorage.getItem(this.storageKey);
    token ? this.iniciarConsulta(token) : this.solicitarAcceso();
  }

  ngOnDestroy(): void {
    this.limpiarExpiracion();
    void this.mesaClienteRealtime.detener();
    this.headerService.showHeader();
  }

  reintentar(): void {
    this.limpiarExpiracion();
    void this.mesaClienteRealtime.detener();
    sessionStorage.removeItem(this.storageKey);
    this.estado = undefined;
    this.solicitud = undefined;
    this.carta = undefined;
    this.error = '';
    this.cargando = true;
    this.solicitarAcceso();
  }

  seleccionarCategoria(idSubFamilia?: number): void {
    this.categoriaActiva = idSubFamilia;
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

  get pendiente(): boolean {
    return (this.estado?.Estado || this.solicitud?.Estado) === 'Pendiente';
  }

  get activa(): boolean { return this.estado?.Estado === 'Activa'; }

  get finalizada(): boolean {
    return ['Rechazada', 'Expirada', 'Cerrada'].includes(this.estado?.Estado || '');
  }

  get nombreEspacio(): string {
    const origen = this.estado || this.solicitud;
    return origen ? `${origen.Espacio} ${origen.Numero}` : '';
  }

  get productosVisibles(): ProductoCartaMesaCliente[] {
    const productos = this.carta?.Productos || [];
    return this.categoriaActiva
      ? productos.filter(x => x.IdSubFamilia === this.categoriaActiva)
      : productos;
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
        this.error = error?.error?.Message || 'La solicitud dejó de estar disponible.';
      }
    });
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
}
