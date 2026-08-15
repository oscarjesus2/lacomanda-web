import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { PausaJornadaCorreccion, RegistroJornada } from 'src/app/models/control-horario.models';
import { ControlHorarioService } from 'src/app/services/control-horario.service';

@Component({
  selector: 'app-control-horario-correccion',
  templateUrl: './control-horario-correccion.component.html',
  styleUrls: ['./control-horario-correccion.component.css'],
})
export class ControlHorarioCorreccionComponent {
  inicioLocal: string;
  finLocal: string;
  motivo = '';
  pausas: PausaJornadaCorreccion[];
  guardando = false;
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly jornada: RegistroJornada,
    private readonly service: ControlHorarioService,
    private readonly dialogRef: MatDialogRef<ControlHorarioCorreccionComponent>,
  ) {
    this.inicioLocal = this.aInput(jornada.InicioLocal);
    this.finLocal = this.aInput(jornada.FinLocal ?? '');
    this.pausas = (jornada.Pausas ?? []).map(pausa => ({
      InicioLocal: this.aInput(pausa.InicioLocal),
      FinLocal: this.aInput(pausa.FinLocal ?? ''),
    }));
  }

  agregarPausa(): void {
    this.pausas.push({ InicioLocal: this.inicioLocal, FinLocal: this.finLocal });
  }

  quitarPausa(indice: number): void {
    this.pausas.splice(indice, 1);
  }

  guardar(): void {
    this.error = '';
    if (!this.inicioLocal || !this.finLocal) {
      this.error = 'Indica la entrada y la salida.';
      return;
    }
    if (this.motivo.trim().length < 5) {
      this.error = 'Explica el motivo de la corrección (mínimo 5 caracteres).';
      return;
    }
    if (this.pausas.some(pausa => !pausa.InicioLocal || !pausa.FinLocal)) {
      this.error = 'Completa el inicio y fin de todas las pausas.';
      return;
    }

    this.guardando = true;
    this.service.corregir(this.jornada.IdRegistroJornada, {
      InicioLocal: this.inicioLocal,
      FinLocal: this.finLocal,
      Motivo: this.motivo.trim(),
      Pausas: this.pausas,
    }).pipe(finalize(() => this.guardando = false)).subscribe({
      next: response => this.dialogRef.close(response.Data),
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  private aInput(value: string): string {
    return value ? value.substring(0, 16) : '';
  }
}
