import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
const ELEMENT_DATA = [
  { tarjeta: 'Visa', ap: 'AP001', monto: 100.00, propina: 10.00 },
  { tarjeta: 'Mastercard', ap: 'AP002', monto: 50.00, propina: 5.00 },
  { tarjeta: 'American Express', ap: 'AP003', monto: 75.00, propina: 7.50 }
];

@Component({
  selector: 'app-dialog-emitir-comprobante',
  templateUrl: './dialog-emitir-comprobante.component.html',
  styleUrls: ['./dialog-emitir-comprobante.component.css']
})
export class DialogEmitirComprobanteComponent { 
  displayedColumns: string[] = ['tarjeta', 'ap', 'monto', 'propina'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);
}

