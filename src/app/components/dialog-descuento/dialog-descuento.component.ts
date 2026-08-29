import { SelectionModel } from '@angular/cdk/collections';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { isDuration } from 'moment';
import { Descuento } from 'src/app/models/descuento.models';
import { DescuentoService } from 'src/app/services/descuento.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import Swal from 'sweetalert2';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-dialog-descuento',
  templateUrl: './dialog-descuento.component.html',
  styleUrls: ['./dialog-descuento.component.css']
})
export class DialogDescuentoComponent {


  displayedColumns: string[] = ['Descripcion', 'Porcentaje'];
  dataSource = new MatTableDataSource<Descuento>();
  selection = new SelectionModel<Descuento>(true, []);
  
  nombreCorto: string;
  idProducto: number;

  txtBuscaDscto: string = '';
 
  lblproductoVisible: boolean = false;
  txtValor: number = 0;
  txtCupon: string = '';
  descuentos: Descuento[] = [];
  filteredDescuentos: Descuento[] = [];
  selectedRow: Descuento;
  descuentoTotal: number;
  descuentoMaximo: number;
  
  retornaTipoDescuento: string = 'P';
  retornaIdDescuento: number = 0;
  retornaPorcentaje: number = 0;
  retonaValorVale: number = 0;
  retornaNroCupon: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) 
    public data: any,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogDescuentoComponent>,
    private descuentoService: DescuentoService,
    private texts: TenantTextCatalogService,
  )
  {
    this.idProducto = data.idProducto;
    this.nombreCorto = data.nombreCorto;
    this.descuentoTotal = data.descuentoTotal;
    this.descuentoMaximo = data.descuentoMaximo;
  }


  ngOnInit(): void {
    this.cargarDescuentos();
  }

  /** El valor se expresa como monto (no como %) en Vale, Abono y Reserva. */
  get usaMonto(): boolean {
    return this.retornaTipoDescuento === 'V'
      || this.retornaTipoDescuento === 'A'
      || this.retornaTipoDescuento === 'R';
  }

  /** Convierte el código de letra ('P','T','V') al número del enum backend */
  private tipoLetraANumero(letra: string): number {
    switch (letra) {
      case 'P': return 1; // PorProducto
      case 'T': return 2; // Total
      case 'V': return 3; // Vale
      default:  return -1;
    }
  }

  cargarDescuentos(): void {
    this.descuentoService.getDescuentos().subscribe((response) => {
      this.descuentos = response.Data.map(d => ({ ...d, TipoDescuento: Number(d.TipoDescuento) }));
      this.filteredDescuentos = this.descuentos;
      this.dataSource.data = this.filteredDescuentos.filter(
        x => x.TipoDescuento === this.tipoLetraANumero(this.retornaTipoDescuento)
      );
    }, error => {
      console.error('Error al obtener descuentos:', error);
    });
  }

  buscarDescuentos(): void {
    const filtro = this.txtBuscaDscto.trim().toLowerCase();
    this.dataSource.filter = filtro ? filtro : '';
  }

  descuentoPorTipo(tipodeso: string){
    this.selectedRow = null; 
    this.retornaTipoDescuento= tipodeso;
    this.filteredDescuentos = this.descuentos;
    this.dataSource.data = this.filteredDescuentos.filter(
      x => x.TipoDescuento === this.tipoLetraANumero(this.retornaTipoDescuento)
    );
    // Solo el descuento por producto muestra el chip del producto seleccionado.
    this.lblproductoVisible = (tipodeso === 'P');
  }
  
  selectRow(row: any) {
    this.selectedRow = row; 
    this.txtValor = this.selectedRow.Porcentaje;
  }

  cmdAceptar() {
    try {

      if (this.retornaTipoDescuento !== "R") {
        if (!this.selectedRow) {
          this.showAlert(this.texts.get('enterDiscountForSale'), "warning");
          return;
        }else{
          this.retornaIdDescuento = this.selectedRow.IdDescuento; // ya es number
        }
      }

      if (this.retornaTipoDescuento === "V") {
        if (this.descuentoTotal < Number(this.txtValor)) {
          this.showAlert(this.texts.get('maxVoucherDiscount', { max: this.descuentoMaximo }), "warning");
          return;
        }
        this.retornaPorcentaje = (Number(this.txtValor) / this.descuentoTotal) * 100;
      }

      if (!this.txtCupon) {
        this.showAlert(this.texts.get('enterCouponVoucherReservation'), "warning");
        return;
      }

      if (this.retornaTipoDescuento === "T" || this.retornaTipoDescuento === "P" ) {
        this.retornaPorcentaje = this.selectedRow.Porcentaje; 
      }

      if (this.retornaTipoDescuento === "V" || this.retornaTipoDescuento === "R" || this.retornaTipoDescuento === "A") {
        if (isNaN(Number(this.txtValor))) {
          this.showAlert(this.texts.get('enterVoucherValue'), "warning");
          return;
        }
        this.retonaValorVale = Number(this.txtValor);
      }

      Swal.fire({
        title: this.texts.get('confirmExecuteDiscount'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: this.texts.get('yes'),
        cancelButtonText: this.texts.get('no')
      }).then((result) => {
        if (result.isConfirmed) {
          this.retornaNroCupon = this.txtCupon;  
          this.dialogRef.close({ retornaIdDescuento: this.retornaIdDescuento, retornaTipoDescuento : this.retornaTipoDescuento, retornaPorcentaje: this.retornaPorcentaje, retonaValorVale: this.retonaValorVale, retornaNroCupon: this.retornaNroCupon });
        }
      });
    } catch (error) {
      this.showAlert(error.message, "error");
    }
  }
 
  showAlert(message: string, icon: 'success' | 'error' | 'warning') {
    // El éxito no puede salir igual que un fallo: se avisa con un toast que se
    // va solo, mientras que error y advertencia sí esperan a que se lean.
    if (icon === 'success') {
      Notificar.exito(message);
      return;
    }

    if (icon === 'warning') {
      void Notificar.advertencia(this.texts.get('validation'), message);
      return;
    }

    void Notificar.error(this.texts.get('error'), message);
  }
}
