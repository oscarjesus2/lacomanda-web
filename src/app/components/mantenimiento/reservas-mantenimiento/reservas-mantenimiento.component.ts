import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';
import { ConfiguracionReservas, EspacioReserva, HorarioReserva } from 'src/app/models/reservas.models';
import { ReservasService } from 'src/app/services/reservas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reservas-mantenimiento',
  templateUrl: './reservas-mantenimiento.component.html'
})
export class ReservasMantenimientoComponent implements OnInit {
  readonly dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  seccion: 'agenda' | 'configuracion' | 'mesas' = 'agenda';
  configuracion: ConfiguracionReservas | null = null;
  espacios: EspacioReserva[] = [];
  cargando = false;
  guardando = false;
  publicUrl = `${location.origin}/reservas`;

  constructor(
    private readonly service: ReservasService,
    private readonly dialogRef: MatDialogRef<ReservasMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    forkJoin({
      configuracion: this.service.obtenerConfiguracion(),
      espacios: this.service.listarEspacios()
    }).pipe(finalize(() => this.cargando = false)).subscribe({
      next: data => {
        this.configuracion = data.configuracion.Data;
        this.espacios = data.espacios.Data ?? [];
      },
      error: error => this.error(error, 'No se pudo cargar el módulo de reservas.')
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

  copiarEnlace(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => Swal.fire({ icon: 'success', title: 'Enlace copiado', timer: 1200, showConfirmButton: false }));
  }

  cerrar(): void { this.dialogRef.close(); }

  private error(error: any, fallback: string): void {
    Swal.fire('Reservas', error?.error?.Message || fallback, 'error');
  }
}
