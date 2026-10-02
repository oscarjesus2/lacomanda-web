import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize, firstValueFrom, interval, Subscription } from 'rxjs';
import {
  AeatEnvioMonitorRegistro,
  AeatEnvioMonitorResultado,
} from 'src/app/models/aeat-envio-monitor.models';
import { AeatEnvioMonitorService } from 'src/app/services/aeat-envio-monitor.service';
import Swal from 'sweetalert2';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-aeat-envio-monitor',
  templateUrl: './aeat-envio-monitor.component.html',
  styleUrls: ['../cpe-envio-monitor/cpe-envio-monitor.component.css'],
})
export class AeatEnvioMonitorComponent implements OnInit, OnDestroy {
  readonly estados = [
    { codigo: '', nombre: 'Todos los estados' },
    { codigo: 'SIN_REGISTRO', nombre: 'Sin registro fiscal' },
    { codigo: 'PENDIENTE_ENVIO', nombre: 'Pendiente de envío' },
    { codigo: 'ENVIADO', nombre: 'Enviado' },
    { codigo: 'ACEPTADO', nombre: 'Aceptado' },
    { codigo: 'ACEPTADO_CON_ERRORES', nombre: 'Aceptado con errores' },
    { codigo: 'RECHAZADO', nombre: 'Rechazado' },
    { codigo: 'ERROR_TECNICO', nombre: 'Error técnico' },
    { codigo: 'CONSERVADO_NO_VERIFACTU', nombre: 'Conservado localmente' },
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
  resultado: AeatEnvioMonitorResultado = this.emptyResult();

  private autoRefreshSubscription?: Subscription;

  constructor(
    private readonly service: AeatEnvioMonitorService,
    private readonly dialogRef: MatDialogRef<AeatEnvioMonitorComponent>,
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

  get registros(): AeatEnvioMonitorRegistro[] {
    if (!this.estado) {
      return this.resultado.Registros;
    }
    return this.resultado.Registros.filter(
      registro => registro.EstadoCodigo === this.estado
        || (this.estado === 'PENDIENTE_ENVIO'
          && ['SIN_REGISTRO', 'GENERADO'].includes(registro.EstadoCodigo)),
    );
  }

  get reintentables(): AeatEnvioMonitorRegistro[] {
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
            'No se pudo consultar el estado de los registros fiscales.';
          this.errorMessage = message;
          if (showError) {
            Swal.fire('Monitor AEAT', message, 'error');
          }
        },
      });
  }

  async reintentarUno(registro: AeatEnvioMonitorRegistro): Promise<void> {
    await this.reintentar(
      [registro],
      `¿Reintentar ${registro.OperacionCodigo === 'ANULACION' ? 'la anulación' : 'el alta'} de ${registro.NumeroDocumento}?`,
    );
  }

  async reintentarTodos(): Promise<void> {
    await this.reintentar(
      this.reintentables,
      `¿Programar nuevamente las ${this.reintentables.length} operaciones AEAT agotadas?`,
    );
  }

  async subsanar(registro: AeatEnvioMonitorRegistro): Promise<void> {
    if (this.reintentando || !registro.PuedeSubsanar) {
      return;
    }

    const confirmado = await Notificar.confirmar({
      titulo: `Subsanar ${registro.NumeroDocumento}`,
      detalle:
        'Se conservará la factura y su correlativo. El sistema generará otra ' +
        'generación del registro fiscal, enlazada con la rechazada, y la enviará a la AEAT.',
      textoConfirmar: 'Generar subsanación',
      textoCancelar: 'Cancelar',
    });
    if (!confirmado) {
      return;
    }

    this.reintentando = true;
    try {
      const response = await firstValueFrom(
        this.service.subsanar(registro.IdRegistro),
      );
      await Notificar.exito(
        'Subsanación programada',
        response.Message || 'El nuevo registro fiscal quedó en cola.',
      );
    } catch {
      // El interceptor muestra el detalle devuelto por el backend.
    } finally {
      this.reintentando = false;
      this.load(false);
    }
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

  trackByRegistro(_: number, registro: AeatEnvioMonitorRegistro): number {
    return registro.IdRegistro || -registro.IdVenta;
  }

  statusClass(code: string): string {
    if (code === 'ACEPTADO') {
      return 'status-badge--success';
    }
    if (code === 'RECHAZADO' || code === 'ERROR_TECNICO') {
      return 'status-badge--danger';
    }
    if (code === 'ACEPTADO_CON_ERRORES'
      || code === 'PENDIENTE_ENVIO'
      || code === 'GENERADO'
      || code === 'SIN_REGISTRO') {
      return 'status-badge--warning';
    }
    return 'status-badge--info';
  }

  private async reintentar(
    registros: AeatEnvioMonitorRegistro[],
    titulo: string,
  ): Promise<void> {
    if (this.reintentando || !registros.length) {
      return;
    }

    const confirmado = await Notificar.confirmar({
      titulo,
      detalle: 'Solo se programarán fallos técnicos que hayan agotado sus intentos automáticos y que no tengan otro envío activo.',
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
      const operaciones: Array<'ALTA' | 'ANULACION'> = ['ALTA', 'ANULACION'];
      for (const operacion of operaciones) {
        const ids = registros
          .filter(registro => registro.OperacionCodigo === operacion)
          .map(registro => registro.IdVenta);
        for (let inicio = 0; inicio < ids.length; inicio += 500) {
          const response = await firstValueFrom(
            this.service.reintentar(ids.slice(inicio, inicio + 500), operacion),
          );
          encolados += response.Data?.Encolados ?? 0;
          omitidos += response.Data?.Omitidos ?? 0;
        }
      }

      if (encolados > 0) {
        await Notificar.exito(
          'Reintento AEAT programado',
          `${encolados} operación(es) en cola${omitidos ? `; ${omitidos} omitida(s)` : ''}.`,
        );
      } else {
        await Notificar.advertencia(
          'No se reencoló ninguna operación',
          'Su estado cambió o ya existe un envío activo. Actualiza el monitor.',
        );
      }
    } catch (error: any) {
      await Notificar.error(
        'No se pudo completar el reintento AEAT',
        `${encolados} operación(es) quedaron en cola antes del error. ` +
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

  private emptyResult(): AeatEnvioMonitorResultado {
    return {
      Total: 0,
      Pendientes: 0,
      Aceptados: 0,
      AceptadosConErrores: 0,
      Rechazados: 0,
      ConErrorTecnico: 0,
      Registros: [],
    };
  }
}
