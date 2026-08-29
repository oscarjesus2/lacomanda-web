import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TenantTextKey } from 'src/app/services/localization/tenant-text-catalog.service';

export interface DialogAnfitrionasData {
  producto: string;
  codigos: string[];
}

@Component({
  selector: 'app-dialog-anfitrionas',
  templateUrl: './dialog-anfitrionas.component.html',
  styleUrls: ['./dialog-anfitrionas.component.css'],
})
export class DialogAnfitrionasComponent {
  codigo = '';
  codigos: string[];
  mensajeValidacion: TenantTextKey | null = null;

  readonly numericKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  constructor(
    public readonly dialogRef: MatDialogRef<DialogAnfitrionasComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogAnfitrionasData,
  ) {
    this.codigos = [...(data.codigos ?? [])];
  }

  normalizarCodigo(): void {
    this.codigo = this.codigo.replace(/\D/g, '');
    this.mensajeValidacion = null;
  }

  escribir(digito: string): void {
    this.codigo += digito;
    this.mensajeValidacion = null;
  }

  borrarUltimo(): void {
    this.codigo = this.codigo.slice(0, -1);
    this.mensajeValidacion = null;
  }

  agregar(): void {
    const codigo = this.codigo.trim();
    if (!codigo) {
      this.mensajeValidacion = 'hostessCodeRequired';
      return;
    }

    if (this.codigos.includes(codigo)) {
      this.mensajeValidacion = 'hostessAlreadyAssigned';
      return;
    }

    this.codigos.push(codigo);
    this.codigo = '';
    this.mensajeValidacion = null;
  }

  eliminar(index: number): void {
    this.codigos.splice(index, 1);
    this.mensajeValidacion = null;
  }

  guardar(): void {
    if (this.codigo.trim()) {
      this.agregar();
      if (this.codigo.trim()) {
        return;
      }
    }

    this.dialogRef.close(this.codigos);
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
