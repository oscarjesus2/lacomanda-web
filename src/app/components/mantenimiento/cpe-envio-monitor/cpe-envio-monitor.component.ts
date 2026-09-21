import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize, firstValueFrom, interval, Subscription } from 'rxjs';
import {
  CpeEnvioMonitorRegistro,
  CpeEnvioMonitorResultado,
} from 'src/app/models/cpe-envio-monitor.models';
import { CpeEnvioMonitorService } from 'src/app/services/cpe-envio-monitor.service';
import Swal from 'sweetalert2';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-cpe-envio-monitor',
  templateUrl: './cpe-envio-monitor.component.html',
  styleUrls: ['./cpe-envio-monitor.component.css'],
})
export class CpeEnvioMonitorComponent implements OnInit, OnDestroy {
  readonly estados = [
    { codigo: '', nombre: 'Todos los estados' },
    { codigo: 'PENDIENTE_CIERRE', nombre: 'Pendiente del cierre' },
    { codigo: 'EN_COLA', nombre: 'En cola' },
    { codigo: 'REINTENTO', nombre: 'En reintento' },
    { codigo: 'PROCESANDO', nombre: 'Procesando' },
    { codigo: 'ACEPTADO', nombre: 'Aceptado' },
    { codigo: 'BAJA_ACEPTADA', nombre: 'Baja aceptada' },
    { codigo: 'RECHAZADO', nombre: 'Rechazado' },
    { codigo: 'ANULACION_RECHAZADA', nombre: 'Anulación rechazada' },
    { codigo: 'ERROR', nombre: 'Error de envío' },
    { codigo: 'SIN_ENCOLAR', nombre: 'Sin encolar' },
  ];

  fechaDesde = '';
  fechaHasta = '';
  busqueda = '';
  estado = '';
  autoActualizar = true;
  loading = false;
  reintentando = false;
  errorMessage = '';
  actualizadoUtc: Date | null = null;
  resultado: CpeEnvioMonitorResultado = this.emptyResult();

  private autoRefreshSubscription?: Subscription;

  constructor(
    private readonly service: CpeEnvioMonitorService,
    private readonly dialogRef: MatDialogRef<CpeEnvioMonitorComponent>,
  ) {}

  ngOnInit(): void {
    const hasta = new Date();
    const desde = new Date(hasta);
    desde.setDate(desde.getDate() - 6);
    this.fechaDesde = this.toInputDate(desde);
    this.fechaHasta = this.toInputDate(hasta);
    this.load(true);
    this.configureAutoRefresh();
  }

  ngOnDestroy(): void {
    this.autoRefreshSubscription?.unsubscribe();
  }

  get registros(): CpeEnvioMonitorRegistro[] {
    if (!this.estado) {
      return this.resultado.Registros;
    }
    return this.resultado.Registros.filter(
      registro => registro.EstadoCodigo === this.estado
        || registro.EstadoAnulacionCodigo === this.estado
        || (this.estado === 'RECHAZADO'
          && registro.EstadoCodigo === 'RECHAZADO_DEFINITIVO'),
    );
  }

  get reintentables(): CpeEnvioMonitorRegistro[] {
    return this.registros.filter(registro => registro.PuedeReintentar);
  }

  load(showError: boolean): void {
    if (this.loading || this.reintentando || !this.fechaDesde || !this.fechaHasta) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.service
      .get({
        FechaDesde: this.fechaDesde,
        FechaHasta: this.fechaHasta,
        Busqueda: this.busqueda,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => {
          this.resultado = response.Data ?? this.emptyResult();
          this.actualizadoUtc = new Date();
        },
        error: error => {
          const message =
            error?.error?.Message ||
            error?.error?.message ||
            'No se pudo consultar el estado de los envíos electrónicos.';
          this.errorMessage = message;
          if (showError) {
            Swal.fire('Monitor SUNAT', message, 'error');
          }
        },
      });
  }

  search(): void {
    if (this.fechaDesde > this.fechaHasta) {
      Swal.fire(
        'Periodo no válido',
        'La fecha inicial no puede ser posterior a la fecha final.',
        'warning',
      );
      return;
    }
    this.load(true);
  }

  async reintentarUno(registro: CpeEnvioMonitorRegistro): Promise<void> {
    await this.reintentar(
      [registro],
      `¿Reintentar ${registro.OperacionReintento === 'ANULACION' ? 'la anulación' : 'el envío'} de ${registro.NumeroDocumento}?`,
    );
  }

  async reintentarTodos(): Promise<void> {
    await this.reintentar(
      this.reintentables,
      `¿Reintentar las ${this.reintentables.length} operaciones con error técnico?`,
    );
  }

  configureAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    if (!this.autoActualizar) {
      return;
    }
    this.autoRefreshSubscription = interval(10000).subscribe(() =>
      this.load(false),
    );
  }

  close(): void {
    this.dialogRef.close();
  }

  trackByVenta(_: number, registro: CpeEnvioMonitorRegistro): number {
    return registro.IdVenta;
  }

  statusClass(code: string): string {
    if (code === 'ACEPTADO' || code === 'BAJA_ACEPTADA') {
      return 'status-badge--success';
    }
    if (code === 'RECHAZADO'
      || code === 'RECHAZADO_DEFINITIVO'
      || code === 'ANULACION_RECHAZADA'
      || code === 'ERROR') {
      return 'status-badge--danger';
    }
    if (code === 'PENDIENTE_CIERRE' || code === 'REINTENTO') {
      return 'status-badge--warning';
    }
    return 'status-badge--info';
  }

  private async reintentar(
    registros: CpeEnvioMonitorRegistro[],
    titulo: string,
  ): Promise<void> {
    if (this.reintentando || !registros.length) {
      return;
    }

    const confirmado = await Notificar.confirmar({
      titulo,
      detalle: 'Solo se reintentarán fallos técnicos sin respuesta fiscal concluyente. Los comprobantes rechazados por SUNAT requieren un nuevo correlativo.',
      textoConfirmar: 'Reintentar',
      textoCancelar: 'Cancelar',
    });
    if (!confirmado) {
      return;
    }

    this.reintentando = true;
    let encolados = 0;
    let omitidos = 0;
    try {
      const operaciones: Array<'EMISION' | 'ANULACION'> = [
        'EMISION',
        'ANULACION',
      ];
      for (const operacion of operaciones) {
        const ids = registros
          .filter(registro => registro.OperacionReintento === operacion)
          .map(registro => registro.IdVenta);
        for (let inicio = 0; inicio < ids.length; inicio += 500) {
          const response = await firstValueFrom(
            this.service.reintentar(
              ids.slice(inicio, inicio + 500),
              operacion,
            ),
          );
          encolados += response.Data?.Encolados ?? 0;
          omitidos += response.Data?.Omitidos ?? 0;
        }
      }

      if (encolados > 0) {
        await Notificar.exito(
          'Reintento programado',
          `${encolados} comprobante(s) en cola${omitidos ? `; ${omitidos} omitido(s)` : ''}.`,
        );
      } else {
        await Notificar.advertencia(
          'No se reencoló ningún comprobante',
          'Su estado cambió o ya existe un envío activo. Actualiza el monitor.',
        );
      }
    } catch (error: any) {
      await Notificar.error(
        'No se pudo completar el reintento',
        `${encolados} comprobante(s) quedaron en cola antes del error. ` +
          (error?.error?.Message || error?.error?.message ||
            'Consulta de nuevo el monitor antes de volver a intentarlo.'),
      );
    } finally {
      this.reintentando = false;
      this.load(false);
    }
  }

  private toInputDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private emptyResult(): CpeEnvioMonitorResultado {
    return {
      Total: 0,
      Pendientes: 0,
      EnCola: 0,
      Aceptados: 0,
      Rechazados: 0,
      ConError: 0,
      Registros: [],
    };
  }
}
