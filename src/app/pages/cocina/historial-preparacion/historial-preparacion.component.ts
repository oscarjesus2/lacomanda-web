import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CanalVentaEnum, EstadoPreparacionPedidoEnum } from '../../../enums/enum';
import { LineaPreparacionCocina } from '../../../models/preparacion-cocina.models';
import { CocinaService } from '../../../services/cocina.service';
import { PreparacionRealtimeService } from '../../../services/preparacion-realtime.service';

@Component({
  selector: 'app-historial-preparacion',
  templateUrl: './historial-preparacion.component.html',
})
export class HistorialPreparacionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  readonly columnas = ['comanda', 'producto', 'origen', 'estado', 'enviado', 'ocultado'];
  readonly estados = EstadoPreparacionPedidoEnum;
  readonly dataSource = new MatTableDataSource<LineaPreparacionCocina>();
  desde = this.fechaLocal(new Date());
  hasta = this.desde;
  texto = '';
  estado: EstadoPreparacionPedidoEnum | '' = '';
  cargando = false;
  error = '';
  private cambios?: Subscription;
  private consulta?: Subscription;
  private recargaPendiente = false;
  private destruido = false;

  constructor(
    private readonly cocina: CocinaService,
    private readonly realtime: PreparacionRealtimeService,
    private readonly dialog: MatDialogRef<HistorialPreparacionComponent>,
  ) {
    this.dataSource.filterPredicate = (linea, raw) => {
      const filtro = JSON.parse(raw || '{}');
      const texto = [linea.NroPedido, linea.NroCuenta, linea.Producto, linea.Cliente,
        linea.Ambiente, linea.Espacio, linea.NumeroEspacio, linea.Mozo, linea.EstacionOrigen,
        linea.UsuarioOcultaPreparacion].join(' ').toLocaleLowerCase();
      return texto.includes(filtro.texto || '')
        && (filtro.estado === '' || filtro.estado == null
          || (linea.EstadoPreparacionAlOcultar ?? linea.EstadoPreparacion) === filtro.estado);
    };
  }

  ngOnInit(): void {
    this.cambios = this.realtime.cambios$.subscribe(() => this.cargar());
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.cambios?.unsubscribe();
    this.consulta?.unsubscribe();
  }

  cargar(): void {
    if (this.destruido) return;
    if (this.cargando) {
      this.recargaPendiente = true;
      return;
    }
    const desde = new Date(`${this.desde}T00:00:00`);
    const hasta = new Date(`${this.hasta}T00:00:00`);
    hasta.setDate(hasta.getDate() + 1);
    if (!this.desde || !this.hasta || !Number.isFinite(desde.getTime())
      || !Number.isFinite(hasta.getTime()) || hasta <= desde) {
      this.error = 'Selecciona un periodo válido.';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.consulta = this.cocina.listarHistorial(desde.toISOString(), hasta.toISOString())
      .pipe(finalize(() => {
        this.cargando = false;
        if (this.recargaPendiente && !this.destruido) {
          this.recargaPendiente = false;
          this.cargar();
        }
      })).subscribe({
        next: respuesta => {
          if (!respuesta?.Success) {
            this.error = respuesta?.Message || 'No se pudo cargar el historial.';
            return;
          }
          this.dataSource.data = respuesta.Data ?? [];
          this.filtrar(false);
        },
        error: error => this.error = error?.error?.Message || 'No se pudo cargar el historial.',
      });
  }

  filtrar(reiniciarPagina = true): void {
    this.dataSource.filter = JSON.stringify({ texto: this.texto.trim().toLocaleLowerCase(), estado: this.estado });
    if (reiniciarPagina) this.dataSource.paginator?.firstPage();
  }

  nombreEstado(linea: LineaPreparacionCocina): string {
    return ({
      [EstadoPreparacionPedidoEnum.Enviado]: 'Enviado',
      [EstadoPreparacionPedidoEnum.EnPreparacion]: 'En preparación',
      [EstadoPreparacionPedidoEnum.Preparado]: 'Preparado',
      [EstadoPreparacionPedidoEnum.Entregado]: 'Entregado',
    })[linea.EstadoPreparacionAlOcultar ?? linea.EstadoPreparacion] || 'Sin estado';
  }

  motivo(linea: LineaPreparacionCocina): string {
    return ({ 1: 'Anulado', 2: 'Entregado', 3: 'Facturado', 4: 'Cuenta cobrada y entregada' } as Record<number, string>)
      [linea.MotivoOcultacionPreparacion ?? 0] || 'Ocultado del tablero';
  }

  origen(linea: LineaPreparacionCocina): string {
    if (linea.IdCanalVenta === CanalVentaEnum.PARA_LLEVAR) return 'Para llevar';
    if (linea.IdCanalVenta === CanalVentaEnum.DELIVERY) return 'Delivery';
    return [linea.Ambiente, `${linea.Espacio || 'Mesa'} ${linea.NumeroEspacio ?? ''}`.trim()]
      .filter(Boolean).join(' · ');
  }

  cerrar(): void {
    this.dialog.close();
  }

  private fechaLocal(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }
}
