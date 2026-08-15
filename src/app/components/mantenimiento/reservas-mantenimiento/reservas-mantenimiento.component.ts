import { formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { ConfiguracionReservas, EspacioReserva, HorarioReserva, Reserva } from 'src/app/models/reservas.models';
import { ReservasService } from 'src/app/services/reservas.service';
import { ReservasRealtimeService } from 'src/app/services/reservas-realtime.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reservas-mantenimiento',
  templateUrl: './reservas-mantenimiento.component.html'
})
export class ReservasMantenimientoComponent implements OnInit, OnDestroy {
  readonly dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly estados = ['Pendiente', 'Confirmada', 'Sentada', 'Completada', 'CanceladaCliente', 'CanceladaRestaurante', 'NoPresentada'];
  seccion: 'agenda' | 'configuracion' | 'mesas' = 'agenda';
  configuracion: ConfiguracionReservas | null = null;
  espacios: EspacioReserva[] = [];
  reservas: Reserva[] = [];
  fechaDesde = this.fechaInput(new Date());
  fechaHasta = this.fechaInput(new Date(new Date().setDate(new Date().getDate() + 7)));
  estado = '';
  cargando = false;
  guardando = false;
  publicUrl = `${location.origin}/reservas`;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly service: ReservasService,
    private readonly realtime: ReservasRealtimeService,
    private readonly dialogRef: MatDialogRef<ReservasMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.realtime.iniciar();
    this.subscriptions.add(this.realtime.cambios$.subscribe(() => this.sincronizarAgenda()));
    this.cargando = true;
    forkJoin({
      configuracion: this.service.obtenerConfiguracion(),
      espacios: this.service.listarEspacios(),
      reservas: this.service.listar(this.fechaDesde, this.fechaHasta)
    }).pipe(finalize(() => this.cargando = false)).subscribe({
      next: data => {
        this.configuracion = data.configuracion.Data;
        this.espacios = data.espacios.Data ?? [];
        this.reservas = data.reservas.Data ?? [];
      },
      error: error => this.error(error, 'No se pudo cargar el módulo de reservas.')
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    void this.realtime.detener();
  }

  consultar(): void {
    if (!this.fechaDesde || !this.fechaHasta || this.fechaDesde > this.fechaHasta) return;
    this.cargando = true;
    this.service.listar(this.fechaDesde, this.fechaHasta, this.estado || undefined)
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: response => this.reservas = response.Data ?? [],
        error: error => this.error(error, 'No se pudieron consultar las reservas.')
      });
  }

  private sincronizarAgenda(): void {
    this.service.listar(this.fechaDesde, this.fechaHasta, this.estado || undefined).subscribe({
      next: response => this.reservas = response.Data ?? [],
      error: error => console.warn('No se pudo sincronizar la agenda de reservas.', error)
    });
  }

  agregarHorario(): void {
    this.configuracion?.Horarios.push({ DiaSemana: 1, HoraInicio: '13:00', HoraFin: '16:00' });
  }

  duplicarHorario(horario: HorarioReserva): void {
    if (!this.configuracion) return;
    const siguiente = (horario.DiaSemana + 1) % 7;
    this.configuracion.Horarios.push({ ...horario, DiaSemana: siguiente });
  }

  eliminarHorario(index: number): void {
    this.configuracion?.Horarios.splice(index, 1);
  }

  guardarConfiguracion(): void {
    if (!this.configuracion) return;
    this.guardando = true;
    this.service.guardarConfiguracion(this.configuracion)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: response => {
          this.configuracion = response.Data;
          Swal.fire({ icon: 'success', title: 'Configuración guardada', text: this.configuracion.Publicada ? 'Tu página de reservas ya está disponible.' : 'Los cambios se guardaron como configuración interna.', timer: 2200, showConfirmButton: false });
        },
        error: error => this.error(error, 'No se pudo guardar la configuración.')
      });
  }

  guardarMesas(): void {
    this.guardando = true;
    this.service.guardarEspacios(this.espacios)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: response => {
          this.espacios = response.Data ?? [];
          if (this.configuracion) this.configuracion.MesasHabilitadas = this.espacios.filter(x => x.AceptaReservas).length;
          Swal.fire({ icon: 'success', title: 'Mesas actualizadas', timer: 1600, showConfirmButton: false });
        },
        error: error => this.error(error, 'No se pudieron guardar las capacidades.')
      });
  }

  cambiarEstado(reserva: Reserva, estado: string): void {
    this.service.cambiarEstado(reserva.IdReserva, estado).subscribe({
      next: response => {
        const indice = this.reservas.findIndex(x => x.IdReserva === reserva.IdReserva);
        if (indice >= 0) this.reservas[indice] = response.Data;
      },
      error: error => this.error(error, 'No se pudo cambiar el estado de la reserva.')
    });
  }

  acciones(reserva: Reserva): { estado: string; etiqueta: string; icono: string }[] {
    switch (reserva.Estado) {
      case 'Pendiente': return [{ estado: 'Confirmada', etiqueta: 'Confirmar', icono: 'check' }, { estado: 'CanceladaRestaurante', etiqueta: 'Cancelar', icono: 'close' }];
      case 'Confirmada': return [{ estado: 'Sentada', etiqueta: 'Ha llegado', icono: 'event_seat' }, { estado: 'NoPresentada', etiqueta: 'No se presentó', icono: 'person_off' }, { estado: 'CanceladaRestaurante', etiqueta: 'Cancelar', icono: 'close' }];
      case 'Sentada': return [{ estado: 'Completada', etiqueta: 'Completar', icono: 'done_all' }];
      default: return [];
    }
  }

  contarEstado(estado: string): number {
    return this.reservas.filter(x => x.Estado === estado).length;
  }

  copiarEnlace(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => Swal.fire({ icon: 'success', title: 'Enlace copiado', timer: 1200, showConfirmButton: false }));
  }

  fechaHoraLocal(value: string): string {
    return new Date(value).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  cerrar(): void { this.dialogRef.close(); }

  private fechaInput(value: Date): string { return formatDate(value, 'yyyy-MM-dd', 'en-US'); }

  private error(error: any, fallback: string): void {
    Swal.fire('Reservas', error?.error?.Message || fallback, 'error');
  }
}
