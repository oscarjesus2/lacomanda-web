import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-dialog-mcant',
  templateUrl: './dialog-mcant.component.html',
  styleUrls: ['./dialog-mcant.component.css']
})
export class DialogMCantComponent {
  inputValue: string = '';
  title: string;
  isPassword: boolean;
  minAmount: number;
  showAlpha = false;

  numericKeys: string[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

  alphaRows = [
    ['ESC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '/'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', '*'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '=', '+'],
    ['Espacio', '%']
  ];

  constructor(
    public dialogRef: MatDialogRef<DialogMCantComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.title      = data.title;
    this.inputValue = data.quantity || '';
    this.isPassword = data.hideNumber || false;
    this.minAmount  = data.minAmount || 0;
    if (!data.decimalActive) {
      this.numericKeys = this.numericKeys.filter(k => k !== '.');
    }
  }

  toggleKeyboard(): void {
    this.showAlpha = !this.showAlpha;
    this.dialogRef.updateSize(this.showAlpha ? '760px' : '350px');
  }

  getMaskedPassword(): string {
    return this.isPassword
      ? this.inputValue.replace(/./g, '*')
      : this.inputValue;
  }

  onKeyClick(key: string): void {
    if (key === 'ESC')     { this.inputValue = this.inputValue.slice(0, -1); return; }
    if (key === 'Espacio') { this.inputValue += ' '; return; }
    if (key === '.' && this.inputValue.includes('.')) return;
    this.inputValue += key;
  }

  clear(): void { this.inputValue = ''; }

  accept(): void {
    if (!this.inputValue.trim()) {
      Swal.fire({ title: 'Validación', text: 'Ingrese un valor.', icon: 'warning', confirmButtonText: 'OK' });
      return;
    }

    // Validaciones numéricas solo cuando NO es contraseña/código alfanumérico
    if (!this.isPassword) {
      if (isNaN(Number(this.inputValue))) {
        Swal.fire({ title: 'Validación', text: 'Ingresar solo valores numéricos.', icon: 'warning', confirmButtonText: 'OK' });
        return;
      }
      const num = parseFloat(this.inputValue);
      if (num <= 0) {
        Swal.fire({ title: 'Validación', text: 'Ingrese una cantidad mayor a 0.', icon: 'warning', confirmButtonText: 'OK' });
        return;
      }
      if (this.minAmount !== 0 && num < this.minAmount) {
        Swal.fire({ title: 'Validación', text: `Mínimo debe ingresar ${this.minAmount}.`, icon: 'warning', confirmButtonText: 'OK' });
        return;
      }
    }

    this.dialogRef.close({ value: this.inputValue });
  }

  cancel(): void { this.dialogRef.close(); }
}