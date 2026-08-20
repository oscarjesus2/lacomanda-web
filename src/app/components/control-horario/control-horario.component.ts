import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { RegistroJornada } from 'src/app/models/control-horario.models';
import { ControlHorarioService } from 'src/app/services/control-horario.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-control-horario',
  templateUrl: './control-horario.component.html',
})
export class ControlHorarioComponent implements OnInit, OnDestroy {
  jornada: RegistroJornada | null = null;
  cargando = true;
  procesando = false;
  ahora = new Date();
  private reloj?: ReturnType<typeof setInterval>;

  constructor(
    private readonly service: ControlHorarioService,
    private readonly dialogRef: MatDialogRef<ControlHorarioComponent>,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.reloj = setInterval(() => this.ahora = new Date(), 1000);
  }

  ngOnDestroy(): void {
    if (this.reloj) {
      clearInterval(this.reloj);
    }
  }

  cargar(): void {
    this.cargando = true;
    this.service.obtenerMiJornada()
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: response => this.jornada = response.Data?.JornadaActual ?? null,
      });
  }

  iniciar(): void {
    this.ejecutar(this.service.iniciarJornada(), 'Entrada registrada');
  }

  pausar(): void {
    this.ejecutar(this.service.iniciarPausa(), 'Pausa iniciada');
  }

  reanudar(): void {
    this.ejecutar(this.service.reanudarJornada(), 'Pausa finalizada');
  }

  async finalizar(): Promise<void> {
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Registrar la salida?',
      text: 'La jornada quedará finalizada con la hora actual.',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar salida',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#BF360C',
    });
    if (confirmacion.isConfirmed) {
      this.ejecutar(this.service.finalizarJornada(), 'Salida registrada');
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  get duracion(): string {
    if (!this.jornada) {
      return '00:00:00';
    }

    const inicio = new Date(this.jornada.InicioUtc).getTime();
    const fin = this.jornada.FinUtc
      ? new Date(this.jornada.FinUtc).getTime()
      : this.ahora.getTime();
    const pausas = (this.jornada.Pausas ?? []).reduce((total, pausa) => {
      const pausaInicio = new Date(pausa.InicioUtc).getTime();
      const pausaFin = pausa.FinUtc
        ? new Date(pausa.FinUtc).getTime()
        : this.ahora.getTime();
      return total + Math.max(0, pausaFin - pausaInicio);
    }, 0);
    const segundos = Math.max(0, Math.floor((fin - inicio - pausas) / 1000));
    const horas = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const resto = (segundos % 60).toString().padStart(2, '0');
    return `${horas}:${minutos}:${resto}`;
  }

  private ejecutar(
    operacion: Observable<ApiResponse<RegistroJornada>>,
    mensaje: string,
  ): void {
    if (this.procesando) {
      return;
    }

    this.procesando = true;
    operacion.pipe(finalize(() => this.procesando = false)).subscribe({
      next: response => {
        this.jornada = response.Data?.EstaAbierta ? response.Data : null;
        Notificar.exito(mensaje);
      },
    });
  }
}
