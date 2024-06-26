import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { VentaService } from '../../services/venta.services';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { ventasInterface } from 'src/app/interfaces/ventas.interface';
import { CajaService } from 'src/app/services/caja.services';
import { Caja } from 'src/app/models/caja.models';
import { DialogEmitirComprobanteComponent } from '../dialog-emitir-comprobante/dialog-emitir-comprobante.component';

@Component({
  selector: 'app-dialog-ventasgenerales',
  templateUrl: './dialog-ventasgenerales.component.html',
  styleUrls: ['./dialog-ventasgenerales.component.css']
})
export class DialogVentasgeneralesComponent implements OnInit {
  listCaja: Caja[];
  ventas: ventasInterface[] = [];
  dataSource = new MatTableDataSource<ventasInterface>([]);
  displayedColumns: string[] = [
    'Caja', 'TipoDocumento', 'Documento', 'Cliente', 'FechaVenta',
    'Moneda', 'Dscto', 'Inafecto', 'ValorVenta', 'IGV', 'Servicio',
    'ICBPER', 'Total', 'EstadoDescripcion', 'EstadoPago'
  ];
  ventaSeleccionada: ventasInterface | null = null;
  listarTodosLosTurnos: boolean = false;
  textoFiltro: string = '';
  campoSeleccionado: string = 'TipoDocumento';

  constructor(
    public dialogRef: MatDialogRef<DialogVentasgeneralesComponent>,
    private ventaService: VentaService,
    private spinnerService: NgxSpinnerService,
    private cajaService: CajaService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadVentas();
  }

  loadVentas() {
    this.spinnerService.show();
    var incluyeGeneral: number;
    incluyeGeneral=0;
    this.cajaService.getAllCaja(incluyeGeneral).subscribe(
      cajas => {
        this.listCaja = cajas;
        const caja001 = this.listCaja.find(x => x.IdCaja === '001');

        if (this.listarTodosLosTurnos) {
          this.getListadoVentas(0);
        } else {
          if (caja001 && caja001.TurnoAbierto) {
            this.getListadoVentas(caja001.TurnoAbierto.IdTurno);
          } else {
            this.handleNoTurnoAbiertoError();
          }
        }
      },
      error => {
        console.error('Error al obtener cajas:', error);
        Swal.fire('Algo anda mal', 'Error al obtener cajas', 'error');
        this.spinnerService.hide();
      }
    );
  }

  getListadoVentas(idTurno: number) {
    this.ventaService.getListadoVentas(idTurno).subscribe(
      data => {
        console.log('Datos recibidos:', data); // Agrega esto para verificar la estructura de los datos
        this.ventas = data;
        this.dataSource.data = data;
        this.aplicarFiltro();
        this.spinnerService.hide();
      },
      error => {
        console.error('Error al cargar ventas:', error);
        Swal.fire('Algo anda mal', 'Error al cargar ventas', 'error');
        this.spinnerService.hide();
      }
    );
  }

  aplicarFiltro() {
    if (!this.textoFiltro || !this.campoSeleccionado) {
      this.dataSource.data = this.ventas;
    } else {
      this.dataSource.data = this.ventas.filter(venta =>
        venta[this.campoSeleccionado].toString().toLowerCase().includes(this.textoFiltro.toLowerCase())
      );
    }
  }

  handleNoTurnoAbiertoError() {
    this.spinnerService.hide();
    Swal.fire('Error', 'No se encontró la caja 001 o no tiene turno abierto', 'error');
  }

  actualizarLista(): void {
    this.loadVentas();
  }

  seleccionarVenta(row: ventasInterface): void {
    this.ventaSeleccionada = row;
    console.log('Fila seleccionada: ', row);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  isRowSelected(row: ventasInterface): boolean {
    return this.ventaSeleccionada === row;
  }


  OpenDialogVentasGeneralesTurno(): void {
  
    const dialogTurno = this.dialog.open(DialogEmitirComprobanteComponent, {
      disableClose: true,
      hasBackdrop: true
      // data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero}
    });
  }
  
}
