import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PosicionSelectorData {
  rows: number;
  cols: number;
  occupied: number[];      // posiciones ya usadas (1..rows*cols)
  initial?: number | null; // posición actual (en edición)
}

@Component({
  selector: 'app-posicion-selector-dialog',
  templateUrl: './posicion-selector-dialog.component.html',
  styleUrls: ['./posicion-selector-dialog.component.css']
})
export class PosicionSelectorDialogComponent {
  grid: number[] = [];
  selected: number | null = null;

  constructor(
    private dialogRef: MatDialogRef<PosicionSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PosicionSelectorData
  ) {
    const total = data.rows * data.cols;
    this.grid = Array.from({ length: total }, (_, i) => i + 1);
    this.selected = data.initial ?? null;
  }

  isOccupied(n: number): boolean {
    return this.data.occupied.includes(n);
  }

  isTaken(n: number): boolean {
    const initial = this.data.initial ?? -1;
    return this.data.occupied.includes(n) && n !== initial;
  }

  pick(n: number): void {
    if (this.isTaken(n)) { return; }
    this.selected = n;
  }

  confirm(): void {
    if (this.selected == null) { return; }
    this.dialogRef.close(this.selected);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
