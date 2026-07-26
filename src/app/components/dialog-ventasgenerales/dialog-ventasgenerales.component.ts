import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { VentaService } from '../../services/venta.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { VentasInterface } from 'src/app/interfaces/ventas.interface';
import { DialogEmitirVentaComponent } from '../dialog-emitir-venta/dialog-emitir-venta.component';
import { MatPaginator } from '@angular/material/paginator';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { EnumTipoDocumento } from 'src/app/enums/enum';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-dialog-ventasgenerales',
  templateUrl: './dialog-ventasgenerales.component.html',
  styleUrls: ['./dialog-ventasgenerales.component.css']
})
export class DialogVentasgeneralesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ventas: VentasInterface[] = [];
  dataSource = new MatTableDataSource<VentasInterface>([]);
  columnDefs = [
    { key: 'Caja',              label: 'Caja',       width: 100 },
    { key: 'TipoDocumento',     label: 'Tipo doc.',  width: 130 },
    { key: 'Documento',         label: 'N.º doc.',   width: 130 },
    { key: 'Cliente',           label: 'Cliente',    width: 230 },
    { key: 'FechaVenta',        label: 'Fecha',      width: 110 },
    { key: 'Moneda',            label: 'Moneda',     width: 80 },
    { key: 'Dscto',             label: 'Descuento',  width: 100, numeric: true },
    { key: 'Total',             label: 'Total',      width: 110, numeric: true },
    { key: 'EstadoDescripcion', label: 'Estado',     width: 120 },
    { key: 'acciones',          label: 'Opciones',   width: 80 }
  ];

  displayedColumns: string[] = this.columnDefs.map(c => c.key);
  ventaSeleccionada: VentasInterface | null = null;
  listarTodosLosTurnos = false;
  incluirVentasExpress = false;
  textoFiltro = '';
  campoSeleccionado = 'TipoDocumento';
  procesando = false;

  constructor(
    public dialogRef: MatDialogRef<DialogVentasgeneralesComponent>,
    private ventaService: VentaService,
    private spinnerService: NgxSpinnerService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadVentas();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadVentas(): void {
    const soloTurnoAbierto = this.listarTodosLosTurnos ? 0 : 1;
    const incluirExpress = this.incluirVentasExpress
      ? EnumTipoDocumento.Express
      : 0;
    this.getListadoVentas(soloTurnoAbierto, incluirExpress);
  }
  
  private getListadoVentas(
    soloTurnoAbierto: number,
    incluirExpress: number
  ): void {
    this.procesando = true;
    this.spinnerService.show();

    this.ventaService.getListadoVentas(soloTurnoAbierto, incluirExpress)
      .pipe(
        finalize(() => {
          this.procesando = false;
          this.spinnerService.hide();
        })
      )
      .subscribe({
      next: (data) => {
        this.ventas = data ?? [];
        this.ventaSeleccionada = null;
        this.aplicarFiltro();
      },
      // El interceptor global muestra los errores HTTP.
      error: () => {}
    });
  }

  aplicarFiltro(): void {
    if (!this.textoFiltro || !this.campoSeleccionado) {
      this.dataSource.data = this.ventas;
    } else {
      const filtro = this.textoFiltro.trim().toLocaleLowerCase();
      this.dataSource.data = this.ventas.filter(venta => {
        const valor = venta[this.campoSeleccionado];
        return String(valor ?? '').toLocaleLowerCase().includes(filtro);
      });
    }

    this.dataSource.paginator = this.paginator;
    this.paginator?.firstPage();
  }

  limpiarFiltro(): void {
    this.textoFiltro = '';
    this.aplicarFiltro();
  }

  trackVenta(_: number, venta: VentasInterface): number {
    return venta.IdVenta;
  }

  actualizarLista(): void {
    this.loadVentas();
  }

  seleccionarVenta(row: VentasInterface): void {
    this.ventaSeleccionada = row;
  }

  onNoClick(): void {
    if (this.procesando) {
      return;
    }
    this.dialogRef.close();
  }

  isRowSelected(row: VentasInterface): boolean {
    return this.ventaSeleccionada === row;
  }


  OpenDialogEmitirVenta(): void {
  
    const dialogEmitirVentaComponent = this.dialog.open(DialogEmitirVentaComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '900px',
      maxWidth: '95vw'
    });
  }

  reImprimirDocumento() {
    if (!this.ventaSeleccionada) {
      Swal.fire({
        title: 'ReImprimir',
        text: 'Seleccione un documento',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    this.spinnerService.show();
    this.ventaService.getImpresionComprobanteVenta(this.ventaSeleccionada.IdVenta, 0).subscribe(async (response: ApiResponse<ImpresionDTO[]>) => {
      if (response.Success) 
      {
        await this.imprimir(response.Data);

      } else {
        console.error('Error al obtener los datos', response.Message);
      }
      this.spinnerService.hide();
    });
  }

  async imprimir(listImpresionDTO: ImpresionDTO[]){
    for (const element of listImpresionDTO) {
      await this.ventaService.showPDF(element.Documento);
    }
  }


  anularDocumento(): void {
    if (!this.ventaSeleccionada) {
      Swal.fire('Error', 'Debe seleccionar una venta para anular', 'error');
      return;
    }

    // Confirmación de la anulación
    Swal.fire({
      title: '¿Está seguro de anular el documento seleccionado ' + this.ventaSeleccionada.Documento +  '?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Realiza la anulación de la venta
        const idVenta = this.ventaSeleccionada.IdVenta;
        const motivo = 'Anulado desde el módulo de integración.';
        const anularPedido = true; // Reemplaza si es necesario

        this.spinnerService.show(); // Mostrar spinner mientras se realiza la operación

        this.ventaService.anularDocumentoVenta(idVenta, motivo, anularPedido).subscribe(
          (response: any) => {
            this.spinnerService.hide();
            Swal.fire('Anulado', 'El documento se anuló con éxito', 'success');
            this.actualizarLista(); // Actualiza la lista después de la anulación
          },
          (error: any) => {
            this.spinnerService.hide();
            Swal.fire('Error', 'No se pudo anular el documento', 'error');
          }
        );
      }
    });
  }
  
}
