import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { VentasDTO } from 'src/app/interfaces/ventas.interface';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { StorageService } from 'src/app/services/storage.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { VentaService } from 'src/app/services/venta.service';
import Swal from 'sweetalert2';
import { DialogMCantComponent } from '../dialog-mcant/dialog-mcant.component';
import { Usuario } from 'src/app/models/usuario.models';
import { NgxSpinnerService } from 'ngx-spinner';
import { DialogMTextComponent } from '../dialog-mtext/dialog-mtext.component';
import { NivelUsuarioEnum } from 'src/app/enums/enum';

@Component({
  selector: 'app-dialog-documentos-emitidos',
  templateUrl: './dialog-documentos-emitidos.component.html',
  styleUrls: ['./dialog-documentos-emitidos.component.css']
})
export class DialogDocumentosEmitidosComponent {


  selectedFirstRow: string = 'todos'; // Inicialmente seleccionado "Todos" en la primera fila
  selectedSecondRow: string = 'todos'; // Inicialmente seleccionado "Todos" en la segunda fila

  // Datos de la grilla (puedes reemplazar esto por datos dinámicos)
  displayedColumns: string[] = ['tipo', 'serie', 'numDoc', 'fecha', 'monto', 'cliente', 'numeroDoi', 'forr'];
  dataSource = new MatTableDataSource<VentasDTO>(); 
  idTurno: number;
  filterTipo: string = ''; // Filtro para Tipo ('TK' para Boleta, 'FT' para Factura, etc.)
  filterFormaPago: string = ''; // Filtro para FormaPago ('Soles', 'Dolares', etc.)
  selectedRow: VentasDTO;
  nroDocumento: string = '';
  motivoAnulacion: string = '';
  idUsuarioAdmin: number;

  constructor(private ventaService: VentaService,
    private usuarioService: UsuarioService,
    private spinnerService: NgxSpinnerService,
    private storageService: StorageService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogDocumentosEmitidosComponent>,
    private qzTrayService: QzTrayV224Service,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.idTurno = data.idTurno;
  }
  ngOnInit(): void {
    this.getVentasPorTurno(this.idTurno); 
  }

  
  selectRow(row: any) {
    this.selectedRow = row; // Asigna la fila seleccionada a la propiedad
  }
  
  getVentasPorTurno(idTurno: number): void {
    this.ventaService.getVentasTurno(idTurno).subscribe((response: ApiResponse<VentasDTO[]>) => {
      if (response.Success) {
        this.dataSource.data = response.Data; // Llena la tabla con los datos
        this.applyFilter();
      } else {
        console.error('Error al obtener los datos', response.Message);
      }
    });
  } 
  async imprimir(listImpresionDTO: ImpresionDTO[]): Promise<number> {
    let contador: number = 0;

    for (const element of listImpresionDTO) {
      const printerName = element.NombreImpresora;
      const success = await this.qzTrayService.printPDF(element.Documento, printerName);
      if (success) {
        contador += 1;
      }
    }
    return contador;
  }

  reImprimirDocumento() {
    if (!this.selectedRow) {
      Swal.fire({
        title: 'Anular',
        text: 'Seleccione un documento',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.ventaService.getImpresionComprobanteVenta(this.selectedRow.IdVenta, 1).subscribe((response: ApiResponse<ImpresionDTO[]>) => {
      if (response.Success) {
        this.imprimir(response.Data);
      } else {
        console.error('Error al obtener los datos', response.Message);
      }
    });
  }

  // Función para seleccionar un botón en la primera fila
  selectFirstRow(tipo: string): void {
    this.filterTipo = tipo === 'todos' ? '' : tipo; // Si es "todos", quitamos el filtro
    this.applyFilter(); // Aplicar el filtro
    this.selectedRow = null;
  }

  // Filtrar según la forma de pago (segunda fila de botones)
  selectSecondRow(formaPago: string): void {
    this.filterFormaPago = formaPago === 'todos' ? '' : formaPago; // Si es "todos", quitamos el filtro
    this.applyFilter(); // Aplicar el filtro
    this.selectedRow = null;
  }


  applyFilter(): void {
    this.dataSource.filterPredicate = (data: VentasDTO, filter: string) => {
      const tipoMatches = this.filterTipo === '' || data.Tipo === this.filterTipo;
      const formaPagoMatches = this.filterFormaPago === '' || data.FormaPago === this.filterFormaPago;
      const nroDocumentoMatches = this.nroDocumento === '' || data.NroDoc.includes(this.nroDocumento); 
      return tipoMatches && formaPagoMatches && nroDocumentoMatches; // Debe cumplir con ambos filtros
    };

    this.dataSource.filter = 'apply'; // Disparar el filtro (no importa el valor, solo se necesita un cambio en el filtro para aplicarlo)
  }

  anularDocumento() {
    if (!this.selectedRow) {
      Swal.fire({
        title: 'Anular',
        text: 'Seleccione un documento',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    const IntIdVenta = this.selectedRow.IdVenta;
    const idTipoPedido = this.selectedRow.IdTipoPedido;
    let idUsuarioAnula = 0;
  
    if (this.motivoAnulacion === "") {
      Swal.fire({
        title: 'Anular',
        text: 'Ingrese el Motivo de Anulación del Documento',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
  
    if (this.storageService.getCurrentUser().IdNivel !== 1) {
      Swal.fire({
        title: 'Anular',
        text: 'No tiene permiso para ANULAR. Ingresa la Clave del Administrador',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(async () => {
        idUsuarioAnula = await this.abrirModalClaveAnula();  // Ahora esperamos a que se resuelva la promesa
        this.confirmarAnulacion(IntIdVenta, idTipoPedido, idUsuarioAnula);
      });
    } else {
      idUsuarioAnula = this.storageService.getCurrentUser().IdUsuario;
      this.confirmarAnulacion(IntIdVenta, idTipoPedido, idUsuarioAnula);
    }
  }
  
  confirmarAnulacion(IntIdVenta: number, idTipoPedido: string, idUsuarioAnula: number) {
    Swal.fire({
      title: 'Anulación',
      text: '¿Está seguro de Anular el Documento seleccionado?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        if (idTipoPedido === "004") {
          this.anularDocumentoVenta(IntIdVenta, idUsuarioAnula, true);
        } else {
          Swal.fire({
            title: 'Anular Pedido',
            text: '¿Desea Anular también el Pedido del Documento?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí',
            cancelButtonText: 'No'
          }).then((result) => {
            const anularPedido = result.isConfirmed;
            this.anularDocumentoVenta(IntIdVenta, idUsuarioAnula, anularPedido);
          });
        }
      }
    });
  }
  
  anularDocumentoVenta(IntIdVenta: number, idUsuarioAnula: number, anularPedido: boolean) {
    this.spinnerService.show();
    this.ventaService.anularDocumentoVenta(IntIdVenta, this.motivoAnulacion, idUsuarioAnula, anularPedido).subscribe(
      (response: ApiResponse<ImpresionDTO[]>) => {
        if (response.Success) {
          Swal.fire('Anulado', 'El documento se anuló con éxito', 'success');
          this.getVentasPorTurno(this.idTurno); 
          this.motivoAnulacion='';
          this.selectedRow = null;
        }
        this.spinnerService.hide();
      },
      () => {
        this.spinnerService.hide();
      }
    );
  }
  
  abrirTeclado(): void {
    const dialogRef = this.dialog.open(DialogMTextComponent, {
      width: '800px',
      data: { texto: '' } // Puedes pasar algún valor inicial si lo deseas
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Agrega el texto ingresado por el usuario a las observaciones
        this.motivoAnulacion = result.value ;
      }
    });
  }
  
  // Método para abrir el modal de clave de anulación
  abrirModalClaveAnula(): Promise<number> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: {
          title: 'Ingresar Código de Administrador',
          hideNumber: true,
          decimalActive: false
        }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.value) {
          const codigoAdmin = result.value;
  
          // Validar el código del administrador llamando a la API
          this.usuarioService.getUsuarioAuth(NivelUsuarioEnum.Administrador, codigoAdmin).subscribe((response: ApiResponse<Usuario>) => {
            if (response.Success && response.Data) {
              resolve(response.Data.IdUsuario);  // Devolvemos el valor
            } else {
              Swal.fire({
                title: 'Código inválido',
                text: 'El código ingresado no es correcto.',
                icon: 'error',
                confirmButtonText: 'OK'
              });
              resolve(-1); // Código inválido
            }
          });
        } else {
          Swal.fire({
            title: 'Operación cancelada',
            text: 'No se ingresó ningún código.',
            icon: 'info',
            confirmButtonText: 'OK'
          });
          resolve(-1);  // Modal cancelado
        }
      });
    });
  }
  
  
  

  onNroDocumentoChange(): void {
    this.applyFilter(); // Aplicar el filtro cada vez que cambie el número de documento
  }

  salir() {
    this.dialogRef.close();
   }
}