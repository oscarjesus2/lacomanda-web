import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { VentaService } from '../../services/venta.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { VentasInterface } from 'src/app/interfaces/ventas.interface';
import { CajaService } from 'src/app/services/caja.service';
import { Caja } from 'src/app/models/caja.models';
import { DialogEmitirVentaComponent } from '../dialog-emitir-venta/dialog-emitir-venta.component';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-dialog-ventasgenerales',
  templateUrl: './dialog-ventasgenerales.component.html',
  styleUrls: ['./dialog-ventasgenerales.component.css']
})
export class DialogVentasgeneralesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  listCaja: Caja[];
  ventas: VentasInterface[] = [];
  dataSource = new MatTableDataSource<VentasInterface>([]);
  displayedColumns: string[] = [
    'Caja', 'TipoDocumento', 'Documento', 'Cliente', 'FechaVenta',
    'Moneda', 'Dscto', 'Inafecto', 'ValorVenta', 'IGV', 'Servicio',
    'ICBPER', 'Total', 'EstadoDescripcion', 'EstadoPago'
  ];
  ventaSeleccionada: VentasInterface | null = null;
  listarTodosLosTurnos: boolean = false;
  listarDI: boolean = false;
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

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
  loadVentas() {
    const turno = this.listarTodosLosTurnos ? 0 : 1;
    const di = this.listarDI ? 1 : 0;
    this.getListadoVentas(turno, di);
  }

  handleNoTurnoAbiertoError() {
    this.spinnerService.hide();
    Swal.fire('Error', 'No se encontró la caja 001 o no tiene turno abierto', 'error');
  }
  
  getListadoVentas(soloTurnoAbierto: number, incluirDI: number) {
    this.ventaService.getListadoVentas(soloTurnoAbierto, incluirDI).subscribe(
      data => {
        console.log('Datos recibidos:', data); // Agrega esto para verificar la estructura de los datos
        this.ventas = data;
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator; 
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
      this.dataSource.paginator = this.paginator; 
    } else {
      this.dataSource.data = this.ventas.filter(venta =>
        venta[this.campoSeleccionado].toString().toLowerCase().includes(this.textoFiltro.toLowerCase())
      );
      this.dataSource.paginator = this.paginator; 
    }
  }


  actualizarLista(): void {
    this.spinnerService.show(); 
    this.loadVentas();
  }

  seleccionarVenta(row: VentasInterface): void {
    this.ventaSeleccionada = row;
    console.log('Fila seleccionada: ', row);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  isRowSelected(row: VentasInterface): boolean {
    return this.ventaSeleccionada === row;
  }


  OpenDialogEmitirVenta(): void {
  
    const dialogEmitirVentaComponent = this.dialog.open(DialogEmitirVentaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px', // Establece el ancho del diálogo
      height: '610px', // Establece la altura del diálogo
      // minWidth: '300px', // Establece el ancho mínimo del diálogo
      // minHeight: '300px', // Establece la altura mínima del diálogo
      // maxWidth: '80vw', // Establece el ancho máximo del diálogo en porcentaje de la ventana
      // maxHeight: '80vh' // Establece la altura máxima del diálogo en porcentaje de la ventana
    });
  }
  
}
