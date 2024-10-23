import { SelectionModel } from '@angular/cdk/collections';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { isDuration } from 'moment';
import { Descuento } from 'src/app/models/descuento.models';
import { DescuentoService } from 'src/app/services/descuento.service';
import Swal from 'sweetalert2';

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
  label10: string = 'Dscto';
  label2: string = '%';
  label3: string = 'Nº Cupón';
  descuentos: Descuento[] = [];
  filteredDescuentos: Descuento[] = [];
  selectedRow: Descuento;
  descuentoTotal: number;
  descuentoMaximo: number;
  
  retornaTipoDescuento: string = 'P';
  retornaIdDescuento: string = '';
  retornaPorcentaje: number = 0;
  retonaValorVale: number = 0;
  retornaNroCupon: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) 
    public data: any,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<DialogDescuentoComponent>,
    private descuentoService: DescuentoService,
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

  cargarDescuentos(): void {
    this.descuentoService.getDescuentos().subscribe((response) => {
      this.descuentos = response.Data;
      this.filteredDescuentos =  this.descuentos;
      this.dataSource.data = this.filteredDescuentos.filter(x=> x.TipoDescuento === this.retornaTipoDescuento); 
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
    this.filteredDescuentos =  this.descuentos;
    this.dataSource.data = this.filteredDescuentos.filter(x=> x.TipoDescuento === this.retornaTipoDescuento); 
    if (tipodeso == "P"){
      this.lblproductoVisible = true;
      this.label10 = "Dscto";
      this.label2 = "%";
      this.label3 = "Nº Cupón";
    }
    if (tipodeso == "T"){
      this.lblproductoVisible = false;
      this.label10 = "Dscto";
      this.label2 = "%";
      this.label3 = "Nº Cupón";
    }
    if (tipodeso == "V"){
      this.lblproductoVisible = false;
      this.label10 = "Monto";
      this.label2 = "$";
      this.label3 = "Nº Cupón";
    }
    if (tipodeso == "A"){
      this.lblproductoVisible = false;
      this.label10 = "Monto";
      this.label2 = "$";
      this.label3 = "Numero";
    }
    if (tipodeso == "R"){
      this.lblproductoVisible = false;
      this.label10 = "Monto";
      this.label2 = "$";
      this.label3 = "N° Reserva";
    }
  }
  
  selectRow(row: any) {
    this.selectedRow = row; 
    this.txtValor = this.selectedRow.Porcentaje;
  }

  cmdAceptar() {
    try {

      if (this.retornaTipoDescuento !== "R") {
        if (!this.selectedRow) {
          this.showAlert("Ingrese un descuento para la venta", "warning");
          return;
        }else{
          this.retornaIdDescuento = this.selectedRow.IdDescuento;
        }
      }

      if (this.retornaTipoDescuento === "V") {
        if (this.descuentoTotal < Number(this.txtValor)) {
          this.showAlert(`El descuento por Vale máximo debe ser ${this.descuentoMaximo}.`, "warning");
          return;
        }
        this.retornaPorcentaje = (Number(this.txtValor) / this.descuentoTotal) * 100;
      }

      if (!this.txtCupon) {
        this.showAlert("Ingrese el número del Cupón, Vale o Reserva", "warning");
        return;
      }

      if (this.retornaTipoDescuento === "T" || this.retornaTipoDescuento === "P" ) {
        this.retornaPorcentaje = this.selectedRow.Porcentaje; 
      }

      if (this.retornaTipoDescuento === "V" || this.retornaTipoDescuento === "R" || this.retornaTipoDescuento === "A") {
        if (isNaN(Number(this.txtValor))) {
          this.showAlert("Ingrese el Valor del Vale", "warning");
          return;
        }
        this.retonaValorVale = Number(this.txtValor);
      }

      Swal.fire({
        title: '¿Está seguro de ejecutar el descuento?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
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
    Swal.fire({
      text: message,
      icon: icon,
      confirmButtonText: 'Aceptar'
    });
  }
}
