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
  keys: string[] = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', 'Espacio'
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
