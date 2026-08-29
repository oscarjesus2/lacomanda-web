import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import {
  MonitorComandaDetalle,
  MonitorDocumento,
  MonitorLineaPedido,
  MonitorPedidoResumen,
  MonitorTurno
} from 'src/app/models/monitor-comandas.models';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { MonitorComandasService } from 'src/app/services/monitor-comandas.service';

@Component({
  selector: 'app-monitor-comandas',
  templateUrl: './monitor-comandas.component.html'
})
export class MonitorComandasComponent implements OnInit {
  fechaDesde = this.formatearFechaEntrada(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  fechaHasta = this.formatearFechaEntrada(new Date());
  busqueda = '';
  turnos: MonitorTurno[] = [];
  pedidos: MonitorPedidoResumen[] = [];
  turnoSeleccionado: MonitorTurno | null = null;
  pedidoSeleccionado: MonitorPedidoResumen | null = null;
  detalle: MonitorComandaDetalle | null = null;
  documentoSeleccionado: MonitorDocumento | null = null;
  cargandoTurnos = false;
  cargandoPedidos = false;
  cargandoDetalle = false;
  simboloMoneda = '';
  private solicitudTurnos = 0;
  private solicitudPedidos = 0;
  private solicitudDetalle = 0;

  constructor(
    private readonly dialogRef: MatDialogRef<MonitorComandasComponent>,
    private readonly monitorService: MonitorComandasService,
    private readonly configuracionService: ConfiguracionService
  ) {}

  ngOnInit(): void {
    const configuracion = this.configuracionService.snapshot;
    if (configuracion) {
      this.simboloMoneda = configuracion.SimboloMoneda || '';
    } else {
      this.configuracionService.get().subscribe({
        next: valor => this.simboloMoneda = valor.SimboloMoneda || '',
        error: () => this.simboloMoneda = ''
      });
    }
    this.consultar();
  }

  consultar(): void {
    if (!this.fechaDesde || !this.fechaHasta || this.fechaDesde > this.fechaHasta) {
      Swal.fire(
        'Rango inválido',
        'La fecha inicial no puede ser posterior a la fecha final.',
        'warning'
      );
      return;
    }

    const solicitud = ++this.solicitudTurnos;
    this.cargandoTurnos = true;
    this.turnos = [];
    this.limpiarSeleccion();
    this.monitorService
      .listarTurnos(this.fechaDesde, this.fechaHasta, this.busqueda)
      .subscribe({
        next: respuesta => {
          if (solicitud !== this.solicitudTurnos) return;
          this.cargandoTurnos = false;
          if (!respuesta.Success) {
            this.mostrarError(respuesta.Message);
            return;
          }
          this.turnos = respuesta.Data ?? [];
          if (this.turnos.length) this.seleccionarTurno(this.turnos[0]);
        },
        error: error => {
          if (solicitud !== this.solicitudTurnos) return;
          this.cargandoTurnos = false;
          this.mostrarError(
            error?.error?.Message || 'No se pudieron consultar los turnos.'
          );
        }
      });
  }

  seleccionarTurno(turno: MonitorTurno): void {
    if (this.turnoSeleccionado?.IdTurno === turno.IdTurno && this.pedidos.length) {
      return;
    }

    this.turnoSeleccionado = turno;
    this.pedidoSeleccionado = null;
    this.detalle = null;
    this.documentoSeleccionado = null;
    const solicitud = ++this.solicitudPedidos;
    this.cargandoPedidos = true;
    this.pedidos = [];
    this.monitorService.listarPedidos(turno.IdTurno, this.busqueda).subscribe({
      next: respuesta => {
        if (solicitud !== this.solicitudPedidos) return;
        this.cargandoPedidos = false;
        if (!respuesta.Success) {
          this.mostrarError(respuesta.Message);
          return;
        }
        this.pedidos = respuesta.Data ?? [];
        if (this.pedidos.length) this.seleccionarPedido(this.pedidos[0]);
      },
      error: error => {
        if (solicitud !== this.solicitudPedidos) return;
        this.cargandoPedidos = false;
        this.mostrarError(
          error?.error?.Message || 'No se pudieron consultar las comandas.'
        );
      }
    });
  }

  seleccionarPedido(pedido: MonitorPedidoResumen): void {
    if (this.pedidoSeleccionado?.IdPedido === pedido.IdPedido && this.detalle) {
      return;
    }

    this.pedidoSeleccionado = pedido;
    this.detalle = null;
    this.documentoSeleccionado = null;
    const solicitud = ++this.solicitudDetalle;
    this.cargandoDetalle = true;
    this.monitorService.obtenerDetalle(pedido.IdPedido).subscribe({
      next: respuesta => {
        if (solicitud !== this.solicitudDetalle) return;
        this.cargandoDetalle = false;
        if (!respuesta.Success) {
          this.mostrarError(respuesta.Message);
          return;
        }
        this.detalle = respuesta.Data;
        this.documentoSeleccionado = this.detalle?.Documentos?.[0] ?? null;
      },
      error: error => {
        if (solicitud !== this.solicitudDetalle) return;
        this.cargandoDetalle = false;
        this.mostrarError(
          error?.error?.Message || 'No se pudo reconstruir la trazabilidad de la comanda.'
        );
      }
    });
  }

  seleccionarDocumento(documento: MonitorDocumento): void {
    this.documentoSeleccionado = documento;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) return '—';
    const valor = fecha.substring(0, 10).split('-');
    return valor.length === 3 ? `${valor[2]}/${valor[1]}/${valor[0]}` : fecha;
  }

  formatearFechaHora(fecha?: string | null): string {
    if (!fecha) return '—';
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
      ? fecha
      : valor.toLocaleString('es-ES', {
          dateStyle: 'short',
          timeStyle: 'short'
        });
  }

  formatearHora(fecha?: string | null): string {
    if (!fecha) return '—';
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
      ? fecha
      : valor.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
  }

  formatearImporte(valor: number, simbolo?: string): string {
    return `${simbolo ?? this.simboloMoneda} ${Number(valor || 0).toLocaleString(
      'es-ES',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`.trim();
  }

  estadoClase(estado?: string | null): string {
    const valor = this.normalizar(estado);
    if (valor.includes('anulad') || valor.includes('sin comprobante')) return 'danger';
    if (valor.includes('abiert') || valor.includes('mixto')) return 'warning';
    if (
      valor.includes('pagad') ||
      valor.includes('generad') ||
      valor.includes('cerrad') ||
      valor.includes('activo')
    ) return 'success';
    return 'neutral';
  }

  faseLinea(linea: MonitorLineaPedido): string {
    if (this.normalizar(linea.Estado).includes('anulad')) return 'Anulada';
    if (linea.IdVenta) return 'Incluida en comprobante';
    if (this.normalizar(linea.Estado).includes('cerrad')) {
      return 'Cerrada sin comprobante';
    }
    if (linea.EnviadoImpresion) return 'Enviada a impresión';
    return 'Registrada';
  }

  cuentasDocumento(documento: MonitorDocumento): string {
    return documento.Cuentas?.length
      ? documento.Cuentas.map(cuenta => `Cuenta ${cuenta}`).join(', ')
      : 'Sin cuenta identificada';
  }

  private limpiarSeleccion(): void {
    this.turnoSeleccionado = null;
    this.pedidos = [];
    this.pedidoSeleccionado = null;
    this.detalle = null;
    this.documentoSeleccionado = null;
  }

  private formatearFechaEntrada(fecha: Date): string {
    return formatDate(fecha, 'yyyy-MM-dd', 'en-US');
  }

  private normalizar(valor?: string | null): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private mostrarError(mensaje: string): void {
    Swal.fire('No se pudo cargar el monitor', mensaje, 'error');
  }
}
