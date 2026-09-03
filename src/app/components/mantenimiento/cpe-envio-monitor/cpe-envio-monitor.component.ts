import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize, interval, Subscription } from 'rxjs';
import {
  CpeEnvioMonitorRegistro,
  CpeEnvioMonitorResultado,
} from 'src/app/models/cpe-envio-monitor.models';
import { CpeEnvioMonitorService } from 'src/app/services/cpe-envio-monitor.service';
import Swal from 'sweetalert2';

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
    { codigo: 'RECHAZADO', nombre: 'Rechazado' },
    { codigo: 'ERROR', nombre: 'Error de envío' },
    { codigo: 'SIN_ENCOLAR', nombre: 'Sin encolar' },
  ];

  fechaDesde = '';
  fechaHasta = '';
  busqueda = '';
  estado = '';
  autoActualizar = true;
  loading = false;
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
      registro => registro.EstadoCodigo === this.estado,
    );
  }

  load(showError: boolean): void {
    if (this.loading || !this.fechaDesde || !this.fechaHasta) {
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
    if (code === 'ACEPTADO') {
      return 'status-badge--success';
    }
    if (code === 'RECHAZADO' || code === 'ERROR') {
      return 'status-badge--danger';
    }
    if (code === 'PENDIENTE_CIERRE' || code === 'REINTENTO') {
      return 'status-badge--warning';
    }
    return 'status-badge--info';
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

