import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { VentasDTO } from 'src/app/interfaces/ventas.interface';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import { Moneda } from 'src/app/models/moneda.models';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';
import { StorageService } from 'src/app/services/storage.service';
import { CajaTipoDocumentoService } from 'src/app/services/caja-tipo-documento.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
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
export class DialogDocumentosEmitidosComponent implements OnInit {

  // ── Filtros ───────────────────────────────────────────────────────────────
  /** Tipos de documento configurados en la caja actual (solo Activo=true) */
  tiposDocumento: CajaTipoDocumento[] = [];
  /** Monedas dinámicas por país (Soles, Dólares, Euros, etc.) */
  monedas: Moneda[] = [];

  /** IdTipoDocumento seleccionado; '' = todos */
  filterTipoId: string    = '';
  filterFormaPago: string = '';
  nroDocumento: string    = '';
  motivoAnulacion: string = '';

  // ── Tabla ─────────────────────────────────────────────────────────────────
  displayedColumns: string[] = ['tipo', 'serie', 'numDoc', 'fecha', 'monto', 'cliente', 'numeroDoi', 'forr'];
  dataSource = new MatTableDataSource<VentasDTO>();
  selectedRow: VentasDTO | null = null;
  idTurno: number;

  constructor(
    private ventaService: VentaService,
    private usuarioService: UsuarioService,
    private cajaTipoDocumentoService: CajaTipoDocumentoService,
    private monedaService: MonedaService,
    private configuracionService: ConfiguracionService,
    private spinnerService: NgxSpinnerService,
    private storageService: StorageService,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogDocumentosEmitidosComponent>,
    private qzTrayService: QzTrayV224Service,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.idTurno = data.idTurno;
    this.idCaja  = data.idCaja;
  }

  idCaja: number;

  ngOnInit(): void {
    this.loadTiposDocumento();
    this.loadMonedas();
    this.getVentasPorTurno(this.idTurno);
  }

  // ── Tipos de documento de la caja ────────────────────────────────────────

  loadTiposDocumento(): void {
    this.cajaTipoDocumentoService.GetTiposDocumentos(this.idCaja).subscribe({
      next: (docs) => {
        // Solo mostrar los tipos activos configurados en esta caja
        this.tiposDocumento = (docs ?? []).filter(d => d.Activo);
      },
      error: () => { this.tiposDocumento = []; }
    });
  }

  // ── Monedas por país ──────────────────────────────────────────────────────

  loadMonedas(): void {
    this.configuracionService.get().subscribe({
      next: (cfg) => {
        const paisISO2 = cfg?.PaisISO2;
        const obs = paisISO2
          ? this.monedaService.getMonedaPorPais(paisISO2)
          : this.monedaService.getMoneda();
        obs.subscribe({
          next: (resp) => { this.monedas = resp?.Data ?? []; },
          error: ()    => { this.monedas = []; }
        });
      },
      error: () => {
        this.monedaService.getMoneda().subscribe({
          next: (resp) => { this.monedas = resp?.Data ?? []; },
          error: ()    => { this.monedas = []; }
        });
      }
    });
  }

  // ── Selección de filtros ──────────────────────────────────────────────────

  selectTipoDoc(tipo: CajaTipoDocumento | null): void {
    this.filterTipoId = tipo ? tipo.IdTipoDocumento.toString() : '';
    this.selectedRow  = null;
    this.applyFilter();
  }

  selectFormaPago(formaPago: string): void {
    this.filterFormaPago = formaPago === 'todos' ? '' : formaPago;
    this.selectedRow     = null;
    this.applyFilter();
  }

  selectCredito(): void {
    // Filtro especial: documentos al crédito (EstadoPago pendiente o similar)
    // Mantener lógica original — se puede extender según el modelo de negocio
    this.filterTipoId    = 'credito';
    this.selectedRow     = null;
    this.applyFilter();
  }

  applyFilter(): void {
    this.dataSource.filterPredicate = (data: VentasDTO) => {
      const tipoMatch = this.filterTipoId === '' ||
                        this.filterTipoId === 'credito'
                          ? true  // crédito: sin filtro de tipo (se filtra por estado si aplica)
                          : data.IdTipoDocumento === this.filterTipoId;

      const pagoMatch = this.filterFormaPago === '' || data.FormaPago === this.filterFormaPago;
      const nroMatch  = this.nroDocumento === ''    || data.NroDoc.includes(this.nroDocumento);
      return tipoMatch && pagoMatch && nroMatch;
    };
    this.dataSource.filter = 'apply';
  }

  onNroDocumentoChange(): void { this.applyFilter(); }

  // ── Datos ─────────────────────────────────────────────────────────────────

  selectRow(row: VentasDTO): void { this.selectedRow = row; }

  getVentasPorTurno(idTurno: number): void {
    this.ventaService.getVentasTurno(idTurno).subscribe((response: ApiResponse<VentasDTO[]>) => {
      if (response.Success) {
        this.dataSource.data = response.Data;
        this.applyFilter();
      } else {
        console.error('Error al obtener los datos', response.Message);
      }
    });
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async imprimir(listImpresionDTO: ImpresionDTO[]): Promise<number> {
    let contador = 0;
    for (const element of listImpresionDTO) {
      const success = await this.qzTrayService.printPDF(element.Documento, element.NombreImpresora);
      if (success) contador++;
    }
    return contador;
  }

  reImprimirDocumento(): void {
    if (!this.selectedRow) { this.alertSeleccione(); return; }
    this.ventaService.getImpresionComprobanteVenta(this.selectedRow.IdVenta, 1).subscribe({
      next: (response: ApiResponse<ImpresionDTO[]>) => {
        if (response.Success) this.imprimir(response.Data);
      }
    });
  }

  anularDocumento(): void {
    if (!this.selectedRow) { this.alertSeleccione(); return; }
    if (!this.motivoAnulacion) {
      Swal.fire({ title: 'Anular', text: 'Ingrese el Motivo de Anulación', icon: 'warning', confirmButtonText: 'OK' });
      return;
    }

    const IntIdVenta    = this.selectedRow.IdVenta;
    const idTipoPedido  = this.selectedRow.IdTipoPedido;
    let   idUsuarioAnula = 0;

    if (this.storageService.getCurrentUser().IdNivel !== 1) {
      Swal.fire({ title: 'Anular', text: 'No tiene permiso. Ingresa la Clave del Administrador', icon: 'error', confirmButtonText: 'OK' })
        .then(async () => {
          idUsuarioAnula = await this.abrirModalClaveAnula();
          this.confirmarAnulacion(IntIdVenta, idTipoPedido, idUsuarioAnula);
        });
    } else {
      idUsuarioAnula = this.storageService.getCurrentUser().IdUsuario;
      this.confirmarAnulacion(IntIdVenta, idTipoPedido, idUsuarioAnula);
    }
  }

  confirmarAnulacion(IntIdVenta: number, idTipoPedido: string, idUsuarioAnula: number): void {
    Swal.fire({ title: 'Anulación', text: '¿Está seguro de Anular el Documento?', icon: 'question',
      showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'No'
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (idTipoPedido === '004') {
        this.anularDocumentoVenta(IntIdVenta, idUsuarioAnula, true);
      } else {
        Swal.fire({ title: 'Anular Pedido', text: '¿Anular también el Pedido?', icon: 'warning',
          showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'No'
        }).then(r => this.anularDocumentoVenta(IntIdVenta, idUsuarioAnula, r.isConfirmed));
      }
    });
  }

  anularDocumentoVenta(IntIdVenta: number, idUsuarioAnula: number, anularPedido: boolean): void {
    this.spinnerService.show();
    this.ventaService.anularDocumentoVenta(IntIdVenta, this.motivoAnulacion, idUsuarioAnula, anularPedido).subscribe({
      next: (response: ApiResponse<ImpresionDTO[]>) => {
        if (response.Success) {
          Swal.fire('Anulado', 'El documento se anuló con éxito', 'success');
          this.getVentasPorTurno(this.idTurno);
          this.motivoAnulacion = '';
          this.selectedRow = null;
        }
        this.spinnerService.hide();
      },
      error: () => this.spinnerService.hide()
    });
  }

  abrirTeclado(): void {
    const dialogRef = this.dialog.open(DialogMTextComponent, { width: '800px', data: { texto: '' } });
    dialogRef.afterClosed().subscribe(result => { if (result) this.motivoAnulacion = result.value; });
  }

  abrirModalClaveAnula(): Promise<number> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(DialogMCantComponent, {
        width: '350px',
        data: { title: 'Código de Administrador', hideNumber: true, decimalActive: false }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result?.value) {
          this.usuarioService.getUsuarioAuth(NivelUsuarioEnum.Administrador, result.value).subscribe({
            next: (response: ApiResponse<Usuario>) => {
              if (response.Success && response.Data) resolve(response.Data.IdUsuario);
              else { Swal.fire('Código inválido', '', 'error'); resolve(-1); }
            }
          });
        } else {
          Swal.fire('Operación cancelada', '', 'info');
          resolve(-1);
        }
      });
    });
  }

  private alertSeleccione(): void {
    Swal.fire({ title: 'Atención', text: 'Seleccione un documento de la tabla', icon: 'warning', confirmButtonText: 'OK' });
  }

  salir(): void { this.dialogRef.close(); }
}
