import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
;
import { NgxSpinnerService } from 'ngx-spinner';
import { Cliente } from '../../models/cliente.models';
import { Venta } from '../../models/venta.models';
import { PedidoService } from '../../services/pedido.services';
import Swal from 'sweetalert2/dist/sweetalert2.js';
// import jsPDF from 'jspdf';
// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfMake.vfs = pdfFonts.pdfMake.vfs;
// import htmlToPdfmake from 'html-to-pdfmake';
import { StorageService } from '../../services/storage.services';
import { ProductGrid } from '../../models/product.grid.models';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-dialog-comprobante',
    templateUrl: './dialog-comprobante.component.html'
})
export class DialogComprobanteComponent {

    public razonSocial: string = '';
    public nroDocumento: number = 0;
    public direccion: string = '';
    public documentTypeValue: string = '';
    public muestraFormulario: Boolean = true;
    public muestraMensaje: Boolean = false;
    public muestraBoleta: Boolean = false;
    public messageSucces = '';

    public nroFactura: string = "XXXXXXX";
    public pedidoId: string = "XXXXXXX";
    public usuario: string = "XXXXXXX";
    public fecha: string = "XXXXXXX";

    @ViewChild('pdfTable') pdfTable: ElementRef;

    public listDocumentType: DocumentType[] = [
        { value: 'TK', name: 'Boleta' },
        { value: 'FT', name: 'Factura' }
    ];

    constructor(
        public dialogRef: MatDialogRef<DialogComprobanteComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData, private spinnerService: NgxSpinnerService,
        private pedidoService: PedidoService,
        private storageService: StorageService
    ) {
        this.data.resultado = false;
    }

    async generarComprobante(param: Boolean) {
        var flag: Boolean = false;
        if (param) {
            if (this.nroDocumento) {
                if (this.documentTypeValue == 'TK') {
                    let sizeBoleta: number = this.nroDocumento.toString().length;
                    let lengthBoleta: number = 8;
                    if (sizeBoleta == lengthBoleta) {
                        flag = true;
                    } else {
                        alert('Longitud para Boleta es 8');
                        Swal.fire(
                            'Adventencia!',
                            'Longitud para Boleta es 8 ',
                            'warning'
                        )

                    }
                } else if (this.documentTypeValue == 'FT') {
                    if (this.nroDocumento.toString().length === 11) {
                        flag = true;
                    } else {
                        alert('Longitud para Factura es 11');
                    }
                    if (!this.direccion) {
                        flag = false;
                        alert('La direccion es obligatoria cuando selecciona factura');
                    }
                } else {
                    flag = false;
                    alert('Debe seleccionar tipo de documento.');
                }
            } else {
                flag = false;
                alert('El numero de documento es obligatorio');
            }

            if (!this.razonSocial) {
                flag = false;
                alert('Razon social obligatorio');
            }

            if (flag) {
                this.spinnerService.show();
                var cliente: Cliente = new Cliente(this.razonSocial, this.nroDocumento.toString(), this.direccion);
                var venta: Venta = new Venta(this.documentTypeValue, this.data.idPedido, this.data.userRegister, cliente);
                console.log(JSON.stringify(venta));
                var resultGenerateComprobante: any = await this.pedidoService.guardarDocumentoVenta(venta).toPromise();
                if (resultGenerateComprobante) {

                    Swal.fire(
                        'Good job!',
                        'Se genero el documento ' +
                        resultGenerateComprobante.Serie + '-' +
                        resultGenerateComprobante.NumDocumento +
                        ' correctamente',
                        'success'
                    )
                    
                    this.nroFactura = resultGenerateComprobante.Serie + "-" + resultGenerateComprobante.IdVenta;
                    this.pedidoId = resultGenerateComprobante.IdVenta;
                    this.usuario = this.storageService.getCurrentSession().user.Usuario;
                    this.fecha = resultGenerateComprobante.Fecha;
                    this.data.resultado = true;
                    this.muestraBoleta = true;
                } else {
                    this.messageSucces = 'Hubo un error al registrar el documento';
                    this.data.resultado = false;
                }
                this.spinnerService.hide();
                this.muestraFormulario = false;
                this.muestraMensaje = false;
            }
        } else {
            this.dialogRef.close(this.data);
        }
    }

    public downloadAsPDF() {
        // const doc = new jsPDF();
        // const pdfTable = this.pdfTable.nativeElement;
        // var html = htmlToPdfmake(pdfTable.innerHTML);
        // const documentDefinition = { content: html };
        // pdfMake.createPdf(documentDefinition).print();
    }
}

export interface DialogData {
    idPedido: number,
    userRegister: number,
    productGrid: ProductGrid[],
    resultado: Boolean
}

export interface DocumentType {
    value: string;
    name: string;
}