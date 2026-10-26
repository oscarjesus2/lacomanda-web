import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  CanalVentaEnum,
  EstadoPreparacionPedidoEnum,
  TipoLineaPreparacionPedidoEnum,
} from '../../enums/enum';
import { EstacionPreparacion, LineaPreparacionCocina } from '../../models/preparacion-cocina.models';
import { CocinaService } from '../../services/cocina.service';
import { PreparacionRealtimeService } from '../../services/preparacion-realtime.service';
import { HeaderService } from '../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { HistorialPreparacionComponent } from './historial-preparacion/historial-preparacion.component';

@Component({
  selector: 'app-cocina',
  templateUrl: './cocina.component.html',
  styleUrls: ['./cocina.component.css'],
})
export class CocinaComponent implements OnInit, OnDestroy {
  readonly estados = EstadoPreparacionPedidoEnum;
  cargando = true;
  actualizando = new Set<string>();
  error = '';
  lineas: LineaPreparacionCocina[] = [];
  estacion: EstacionPreparacion | null = null;

  private cambios?: Subscription;
  private consulta?: Subscription;
  private consultando = false;
  private recargaPendiente = false;
  private destruido = false;

  constructor(
    private readonly cocinaService: CocinaService,
    private readonly realtime: PreparacionRealtimeService,
    private readonly headerService: HeaderService,
    private readonly dialog: MatDialog,
  ) {}

  get enviadas(): LineaPreparacionCocina[] {
    return this.porEstado(EstadoPreparacionPedidoEnum.Enviado);
  }

  get enPreparacion(): LineaPreparacionCocina[] {
    return this.porEstado(EstadoPreparacionPedidoEnum.EnPreparacion);
  }

  get preparadas(): LineaPreparacionCocina[] {
    return this.porEstado(EstadoPreparacionPedidoEnum.Preparado);
  }

  get entregadas(): LineaPreparacionCocina[] {
    return this.porEstado(EstadoPreparacionPedidoEnum.Entregado);
  }

  ngOnInit(): void {
    this.headerService.hideHeader();
    this.cambios = this.realtime.cambios$.subscribe(() => this.cargar(false));
    this.cargar();
    this.realtime.iniciar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.cambios?.unsubscribe();
    this.consulta?.unsubscribe();
    this.realtime.detener();
    this.headerService.showHeader();
  }

  cargar(mostrarCarga = true): void {
    if (this.destruido) return;
    if (this.consultando) {
      this.recargaPendiente = true;
      return;
    }
    this.consultando = true;
    if (mostrarCarga) this.cargando = true;
    this.consulta = forkJoin({
      lineas: this.cocinaService.listarLineas(),
      estacion: this.cocinaService.obtenerEstacion(),
    })
      .pipe(finalize(() => {
        this.cargando = false;
        this.consultando = false;
        if (this.recargaPendiente && !this.destruido) {
          this.recargaPendiente = false;
          this.cargar(false);
        }
      }))
      .subscribe({
        next: ({ lineas, estacion }) => {
          if (!lineas?.Success || !estacion?.Success || !estacion.Data) {
            this.error = (!lineas?.Success ? lineas?.Message : estacion?.Message)
              || 'No se pudo actualizar el tablero de preparación.';
            this.lineas = [];
            this.estacion = null;
            return;
          }
          this.error = '';
          this.lineas = lineas.Data ?? [];
          this.estacion = estacion.Data;
        },
        error: error => {
          this.error = error?.error?.Message || 'No se pudo conectar con preparación.';
          this.lineas = [];
          this.estacion = null;
        },
      });
  }

  iniciar(linea: LineaPreparacionCocina): void {
    this.actualizar(linea, EstadoPreparacionPedidoEnum.EnPreparacion);
  }

  marcarPreparado(linea: LineaPreparacionCocina): void {
    this.actualizar(linea, EstadoPreparacionPedidoEnum.Preparado);
  }

  puedeOcultar(linea: LineaPreparacionCocina): boolean {
    return linea.EsAnulado === true || linea.EsFacturado === true
      || linea.EstadoPreparacion === EstadoPreparacionPedidoEnum.Entregado;
  }

  ocultar(linea: LineaPreparacionCocina): void {
    const id = this.identificador(linea);
    if (!this.puedeOcultar(linea) || this.actualizando.has(id)) return;
    this.actualizando.add(id);
    this.cocinaService.ocultarLinea({
      IdPedido: linea.IdPedido, NroCuenta: linea.NroCuenta, Item: linea.Item,
      SubItem: linea.SubItem, TipoLinea: linea.TipoLinea,
    }).pipe(finalize(() => this.actualizando.delete(id))).subscribe({
      next: respuesta => {
        if (!respuesta?.Success) {
          this.error = respuesta?.Message || 'No se pudo ocultar el producto.';
          return;
        }
        this.error = '';
        this.lineas = this.lineas.filter(item => this.identificador(item) !== id);
        this.cargar(false);
      },
      error: error => this.error = error?.error?.Message || 'No se pudo ocultar el producto.',
    });
  }

  verHistorial(): void {
    this.dialog.open(HistorialPreparacionComponent, {
      width: '1200px', maxWidth: '96vw', height: '90vh', autoFocus: false,
    });
  }

  esActualizando(linea: LineaPreparacionCocina): boolean {
    return this.actualizando.has(this.identificador(linea));
  }

  nombreClienteEnTitulo(linea: LineaPreparacionCocina): string {
    return linea.IdCanalVenta === CanalVentaEnum.PARA_LLEVAR
      || linea.IdCanalVenta === CanalVentaEnum.DELIVERY
      ? (linea.Cliente ?? '').trim()
      : '';
  }

  pistaCanal(linea: LineaPreparacionCocina): string {
    switch (linea.IdCanalVenta) {
      case 2:
        return linea.Espacio
          ? `${linea.Ambiente ? `${linea.Ambiente} · ` : ''}${linea.Espacio} ${linea.NumeroEspacio ?? ''}`.trim()
          : 'Mesa';
      case 3:
        return 'Para llevar';
      case 4:
        return 'Delivery';
      default:
        return 'Pedido';
    }
  }

  tipoLinea(linea: LineaPreparacionCocina): string {
    switch (linea.TipoLinea) {
      case TipoLineaPreparacionPedidoEnum.Menu:
        return 'Menú';
      case TipoLineaPreparacionPedidoEnum.Complemento:
        return 'Complemento';
      default:
        return 'Producto';
    }
  }

  readonly trackLinea = (_: number, linea: LineaPreparacionCocina): string =>
    this.identificador(linea);

  private actualizar(
    linea: LineaPreparacionCocina,
    estado: EstadoPreparacionPedidoEnum,
  ): void {
    const id = this.identificador(linea);
    if (this.actualizando.has(id)) return;

    this.actualizando.add(id);
    this.cocinaService.cambiarEstado({
      IdPedido: linea.IdPedido,
      NroCuenta: linea.NroCuenta,
      Item: linea.Item,
      TipoLinea: linea.TipoLinea,
      SubItem: linea.SubItem,
      EstadoPreparacion: estado,
    }).pipe(finalize(() => this.actualizando.delete(id)))
      .subscribe({
        next: respuesta => {
          if (!respuesta?.Success) {
            this.error = respuesta?.Message || 'No se pudo cambiar el estado del producto.';
            return;
          }
          this.error = '';
          this.cargar(false);
        },
        error: error => {
          this.error = error?.error?.Message || 'No se pudo cambiar el estado del producto.';
        },
      });
  }

  private porEstado(estado: EstadoPreparacionPedidoEnum): LineaPreparacionCocina[] {
    return this.lineas.filter(linea => linea.EstadoPreparacion === estado);
  }

  private identificador(linea: LineaPreparacionCocina): string {
    return [linea.IdPedido, linea.NroCuenta, linea.Item, linea.TipoLinea, linea.SubItem ?? 0]
      .join(':');
  }
}
