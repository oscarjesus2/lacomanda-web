import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';
import { Empleado } from 'src/app/models/empleado.models';
import { ConsultaControlHorario, RegistroJornada } from 'src/app/models/control-horario.models';
import { ControlHorarioService } from 'src/app/services/control-horario.service';
import { EmpleadoService } from 'src/app/services/empleado.service';
import { ControlHorarioCorreccionComponent } from '../control-horario-correccion/control-horario-correccion.component';

@Component({
  selector: 'app-control-horario-mantenimiento',
  templateUrl: './control-horario-mantenimiento.component.html',
})
export class ControlHorarioMantenimientoComponent implements OnInit {
  fechaDesde = this.fechaInput(new Date());
  fechaHasta = this.fechaInput(new Date());
  idEmpleado: number | null = null;
  empleados: Empleado[] = [];
  resultado: ConsultaControlHorario | null = null;
  cargando = false;

  constructor(
    private readonly service: ControlHorarioService,
    private readonly empleadoService: EmpleadoService,
    private readonly dialog: MatDialog,
    private readonly dialogRef: MatDialogRef<ControlHorarioMantenimientoComponent>,
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    forkJoin({ empleados: this.empleadoService.getAllEmpleados() })
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: data => {
          this.empleados = (data.empleados.Data ?? []).filter(x => x.Activo === 1);
          this.consultar();
        },
      });
  }

  consultar(): void {
    if (!this.fechaDesde || !this.fechaHasta || this.cargando) {
      return;
    }

    this.cargando = true;
    this.service.consultar(this.fechaDesde, this.fechaHasta, this.idEmpleado)
      .pipe(finalize(() => this.cargando = false))
      .subscribe({ next: response => this.resultado = response.Data });
  }

  corregir(jornada: RegistroJornada): void {
    const referencia = this.dialog.open(ControlHorarioCorreccionComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '680px',
      maxWidth: '96vw',
      data: jornada,
    });
    referencia.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.consultar();
      }
    });
  }

  exportarCsv(): void {
    const registros = this.resultado?.Registros ?? [];
    if (!registros.length) {
      return;
    }

    const filas = [
      ['Empleado', 'Entrada', 'Salida', 'Pausas (min)', 'Trabajo efectivo', 'Estado', 'Corregido'],
      ...registros.map(registro => [
        registro.Empleado,
        this.formatearFecha(registro.InicioUtc),
        registro.FinUtc ? this.formatearFecha(registro.FinUtc) : '',
        registro.MinutosPausa.toString(),
        this.duracion(registro.MinutosTrabajados),
        registro.EstaAbierta ? 'EN CURSO' : 'FINALIZADA',
        registro.TieneCorrecciones ? 'SÍ' : 'NO',
      ]),
    ];
    const csv = '\ufeff' + filas
      .map(fila => fila.map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `control-horario-${this.fechaDesde}-${this.fechaHasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  duracion(minutos: number): string {
    const horas = Math.floor((minutos ?? 0) / 60);
    const resto = (minutos ?? 0) % 60;
    return `${horas} h ${resto.toString().padStart(2, '0')} min`;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private formatearFecha(value: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }

  private fechaInput(value: Date): string {
    const offset = value.getTimezoneOffset() * 60000;
    return new Date(value.getTime() - offset).toISOString().substring(0, 10);
  }
}
