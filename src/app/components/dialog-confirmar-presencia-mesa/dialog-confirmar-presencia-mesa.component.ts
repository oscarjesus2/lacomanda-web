import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DialogConfirmarPresenciaMesaData {
  espacio: string;
  numero: number;
  codigoVisual: string;
}

@Component({
  selector: 'app-dialog-confirmar-presencia-mesa',
  templateUrl: './dialog-confirmar-presencia-mesa.component.html'
})
export class DialogConfirmarPresenciaMesaComponent {
  nroPax: number | null = 1;
  intentoConfirmar = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogConfirmarPresenciaMesaData,
    private readonly dialogRef: MatDialogRef<DialogConfirmarPresenciaMesaComponent, number>
  ) {}

  confirmar(): void {
    this.intentoConfirmar = true;
    const nroPax = Number(this.nroPax);

    if (!Number.isInteger(nroPax) || nroPax < 1) return;

    this.dialogRef.close(nroPax);
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
