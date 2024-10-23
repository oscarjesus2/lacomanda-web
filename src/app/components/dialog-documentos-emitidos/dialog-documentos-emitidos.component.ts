import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

export interface DocumentoEmitido {
  tipo: string;
  serie: string;
  numDoc: string;
  fecha: string;
  monto: number;
  cliente: string;
  numeroDoi: string;
  forr: string;
}

const ELEMENT_DATA: DocumentoEmitido[] = [
  {tipo: 'TK', serie: 'BB02', numDoc: '00014534', fecha: '02/10/2024 22:36', monto: 80.00, cliente: 'cliente Varios', numeroDoi: '0000001', forr: 'Tarje'},
  {tipo: 'TK', serie: 'BB02', numDoc: '00014535', fecha: '02/10/2024 23:36', monto: 800.00, cliente: 'cliente Varios', numeroDoi: '0000000', forr: 'Tarje'},
  // Agrega más documentos según sea necesario
];

@Component({
  selector: 'app-dialog-documentos-emitidos',
  templateUrl: './dialog-documentos-emitidos.component.html',
  styleUrls: ['./dialog-documentos-emitidos.component.css']
})
export class DialogDocumentosEmitidosComponent {
  displayedColumns: string[] = ['tipo', 'serie', 'numDoc', 'fecha', 'monto', 'cliente', 'numeroDoi', 'forr'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);

  constructor() { }

  ngOnInit(): void {}

  obtenerPDFyXML() {
    // Lógica para obtener PDF y XML
    console.log("Obtener PDF y XML");
  }

  reimprimirDocumento() {
    // Lógica para reimprimir el documento
    console.log("Reimprimir Documento");
  }

  modificarFormaPago() {
    // Lógica para modificar la forma de pago
    console.log("Modificar Forma de Pago");
  }

  modificarDocumentoVenta() {
    // Lógica para modificar el documento de venta
    console.log("Modificar Documento de Venta");
  }

  anularDocumento() {
    // Lógica para anular el documento
    console.log("Anular Documento");
  }

  salir() {
    // Lógica para salir de la interfaz o redirigir a otra página
    console.log("Salir");
  }
}
