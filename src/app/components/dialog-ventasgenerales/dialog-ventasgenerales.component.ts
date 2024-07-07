import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { VentaService } from '../../services/venta.services';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { ventasInterface } from 'src/app/interfaces/ventas.interface';
import { CajaService } from 'src/app/services/caja.services';
import { Caja } from 'src/app/models/caja.models';
import { DialogEmitirVentaComponent } from '../dialog-emitir-venta/dialog-emitir-venta.component';

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
    try {
      this.spinnerService.show();

      if (this.listarTodosLosTurnos) 
      {
        this.getListadoVentas(0);
      } else {
        this.getListadoVentas(1);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      Swal.fire('Algo anda mal', 'Error al cargar ventas', 'error');
      this.spinnerService.hide(); // Oculta el spinner en caso de error
    }
  }

  handleNoTurnoAbiertoError() {
    this.spinnerService.hide();
    Swal.fire('Error', 'No se encontró la caja 001 o no tiene turno abierto', 'error');
  }
  
  getListadoVentas(soloTurnoAbierto: number) {
    this.ventaService.getListadoVentas(soloTurnoAbierto).subscribe(
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


  actualizarLista(): void {
    this.spinnerService.show(); 
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
