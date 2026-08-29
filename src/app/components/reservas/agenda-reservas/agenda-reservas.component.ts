import { formatDate } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { Reserva } from 'src/app/models/reservas.models';
import { ReservasRealtimeService } from 'src/app/services/reservas-realtime.service';
import { ReservasService } from 'src/app/services/reservas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agenda-reservas',
  templateUrl: './agenda-reservas.component.html'
})
export class AgendaReservasComponent implements OnInit, OnDestroy {
  @Input() puedeGestionar = false;

  readonly estados = [
    'Pendiente',
    'Confirmada',
    'Sentada',
    'Completada',
    'CanceladaCliente',
    'CanceladaRestaurante',
    'NoPresentada'
  ];

  reservas: Reserva[] = [];
  fechaDesde = this.fechaInput(new Date());
  fechaHasta = this.fechaInput(new Date(new Date().setDate(new Date().getDate() + 7)));
  estado = '';
  cargando = false;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly service: ReservasService,
    private readonly realtime: ReservasRealtimeService
  ) {}

  ngOnInit(): void {
    this.realtime.iniciar();
    this.subscriptions.add(this.realtime.cambios$.subscribe(() => this.sincronizar()));
    this.consultar();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    void this.realtime.detener();
  }

  consultar(): void {
    if (!this.fechasValidas()) return;

    this.cargando = true;
    this.service.listar(this.fechaDesde, this.fechaHasta, this.estado || undefined)
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: response => this.reservas = response.Data ?? [],
        error: error => this.mostrarError(error, 'No se pudieron consultar las reservas.')
      });
  }

  cambiarEstado(reserva: Reserva, estado: string): void {
    if (!this.puedeGestionar) return;

    this.service.cambiarEstado(reserva.IdReserva, estado).subscribe({
      next: response => {
        const indice = this.reservas.findIndex(x => x.IdReserva === reserva.IdReserva);
        if (indice >= 0) this.reservas[indice] = response.Data;
      },
      error: error => this.mostrarError(error, 'No se pudo cambiar el estado de la reserva.')
    });
  }

  acciones(reserva: Reserva): { estado: string; etiqueta: string; icono: string }[] {
    if (!this.puedeGestionar) return [];

    switch (reserva.Estado) {
      case 'Pendiente':
        return [
          { estado: 'Confirmada', etiqueta: 'Confirmar', icono: 'check' },
          { estado: 'CanceladaRestaurante', etiqueta: 'Cancelar', icono: 'close' }
        ];
      case 'Confirmada':
        return [
          { estado: 'Sentada', etiqueta: 'Ha llegado', icono: 'event_seat' },
          { estado: 'NoPresentada', etiqueta: 'No se presentó', icono: 'person_off' },
          { estado: 'CanceladaRestaurante', etiqueta: 'Cancelar', icono: 'close' }
        ];
      case 'Sentada':
        return [{ estado: 'Completada', etiqueta: 'Completar', icono: 'done_all' }];
      default:
        return [];
    }
  }

  contarEstado(estado: string): number {
    return this.reservas.filter(x => x.Estado === estado).length;
  }

  fechaHoraLocal(value: string): string {
    return new Date(value).toLocaleString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private sincronizar(): void {
    if (!this.fechasValidas()) return;

    this.service.listar(this.fechaDesde, this.fechaHasta, this.estado || undefined).subscribe({
      next: response => this.reservas = response.Data ?? [],
      error: error => console.warn('No se pudo sincronizar la agenda de reservas.', error)
    });
  }

  private fechasValidas(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && this.fechaDesde <= this.fechaHasta;
  }

  private fechaInput(value: Date): string {
    return formatDate(value, 'yyyy-MM-dd', 'en-US');
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire('Reservas', error?.error?.Message || fallback, 'error');
  }
}
