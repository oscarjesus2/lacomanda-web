import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dialog-mtext-touch',
  templateUrl: './dialog-mtext.component.html',
  styleUrls: ['./dialog-mtext.component.css']
})
export class DialogMTextComponent {
  inputValue: string = '';
  title: string;
  keys: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '=', '+', '-', '*', '/'];

  keyRows = [
    ['ESC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '/'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', '*'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '=', '+']
  ];


  constructor(
    public dialogRef: MatDialogRef<DialogMTextComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.title = data.title;
    this.inputValue = data.text || '';
  }

  onKeyClick(key: string): void {
    if (key === 'Espacio') {
      this.inputValue += ' ';
    } else if (key === 'Borrar') {
      this.inputValue = this.inputValue.slice(0, -1);
    } else {
      this.inputValue += key;
    }
  }

  clear(): void {
    this.inputValue = '';
  }

  accept(): void {
    if (!this.inputValue.trim()) {
      Swal.fire({
        title: 'Validación',
        text: 'Debe ingresar texto.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    this.dialogRef.close({ value: this.inputValue });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
