import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  keys: string[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

  constructor(
    public dialogRef: MatDialogRef<DialogMCantComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.title = data.title;
    this.inputValue = data.quantity || '';
    this.isPassword = data.hideNumber || false;
    this.minAmount = data.minAmount || 0;
    this.keys = data.decimalActive ? this.keys : this.keys.filter(key => key !== '.');
  }

  onKeyClick(key: string): void {
    if (!(key === '.' && this.inputValue.includes('.'))) {
      this.inputValue += key;
    }
  }

  clear(): void {
    this.inputValue = '';
  }

  accept(): void {
    if (this.inputValue === '' || isNaN(Number(this.inputValue))) {
      alert('Ingresar solo valores numéricos.');
      return;
    }

    const inputValue = parseFloat(this.inputValue);
    if (inputValue <= 0) {
      alert('Ingrese una cantidad mayor a 0');
      return;
    }

    if (this.minAmount !== 0 && inputValue < this.minAmount) {
      alert(`Minimo debe ingresar ${this.minAmount}.`);
      return;
    }

    this.dialogRef.close({ value: this.inputValue });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}