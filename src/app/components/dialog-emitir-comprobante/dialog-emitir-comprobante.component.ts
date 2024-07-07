import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

interface Registro {
  tarjeta: string;
  ap: string;
  monto: number;
  propina: number;
}

const ELEMENT_DATA: Registro[] = [
  { tarjeta: 'Visa', ap: 'AP001', monto: 100.00, propina: 10.00 }
];

@Component({
  selector: 'app-dialog-emitir-comprobante',
  templateUrl: './dialog-emitir-comprobante.component.html',
  styleUrls: ['./dialog-emitir-comprobante.component.css']
})
export class DialogEmitirComprobanteComponent { 
  
  constructor(
    public dialogRef: MatDialogRef<DialogEmitirComprobanteComponent>
  ) {}

  displayedColumns: string[] = ['tarjeta', 'ap', 'monto', 'propina', 'acciones'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);
  nuevoRegistro: Registro = { tarjeta: '', ap: '', monto: 0, propina: 0 };
  tarjetas: string[] = ['Visa', 'Mastercard', 'Diners'];

  agregarRegistro() {
    if (this.nuevoRegistro.tarjeta && this.nuevoRegistro.ap && this.nuevoRegistro.monto && this.nuevoRegistro.propina) {
      this.dataSource.data = [...this.dataSource.data, { ...this.nuevoRegistro }];
      this.nuevoRegistro = { tarjeta: '', ap: '', monto: 0, propina: 0 };
    }
  }

  eliminarRegistro(element: Registro) {
    this.dataSource.data = this.dataSource.data.filter(registro => registro !== element);
  }
  salir(): void {
    this.dialogRef.close();
  }

}
