import { formatDate } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { InformeContableInterface as InformeContableVentaInterface } from 'src/app/interfaces/ventas.interface';
import { InformeContableCompraInterface } from 'src/app/interfaces/compras.interface';
import { TipoDocumento } from 'src/app/models/tipodocumento.models';
import { TipoDocumentoService } from 'src/app/services/tipodocumento.service';
import { VentaService } from 'src/app/services/venta.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { NgModel } from '@angular/forms';
import { CompraService } from 'src/app/services/compra.service';

@Component({
  selector: 'app-dialog-reportecontable',
  templateUrl: './dialog-reportecontable.component.html',
  styleUrls: ['./dialog-reportecontable.component.css']
})
export class DialogReportecontableComponent {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  tipoInformeSeleccionado: string = 'Ventas';
  listTipoDocumentoVentas: TipoDocumento[];
  listSeries: TipoDocumento[];
  informeContableVentaInterface: InformeContableVentaInterface[] = [];
  informeContableCompraInterface: InformeContableCompraInterface[] = [];
  serieSeleccionada: string = '0';
  tipoDocumentoSeleccionado: string = '0';

  fechaInicial: string;
  fechaFinal: string;

  constructor(
    public dialogRef: MatDialogRef<DialogReportecontableComponent>,
    public tipoDocumentoService: TipoDocumentoService,
    public ventaService: VentaService,
    public compraService: CompraService,
    private spinnerService: NgxSpinnerService,
  ) { }
  
  onNoClick(): void {
    this.dialogRef.close();
  }
 
  ngOnInit(){
    if (this.tipoInformeSeleccionado === 'Ventas') {
      this.initializeTipoDocumento();
      this.initializeSeries();
    }
  }
  exportToExcel(informeContableInterface: any): void {
    // Nombre de la hoja de cálculo
    const worksheetName = 'InformeContable';

    // Generar la hoja de cálculo a partir de los datos
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(informeContableInterface);

    // Crear el libro de trabajo y agregar la hoja
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, worksheetName);

    // Nombre del archivo Excel
    const excelFileName = `InformeContable_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Exportar el archivo Excel
    XLSX.writeFile(wb, excelFileName);
  }

  private async initializeTipoDocumento(): Promise<void> {
      this.listTipoDocumentoVentas = await this.tipoDocumentoService.getTipoDocumentoVentas().toPromise();
  }

  private async initializeSeries(): Promise<void> {
    this.listSeries = await this.tipoDocumentoService.getSeriesVentas().toPromise();
}

private async initializeTipoDocumentoCompras(): Promise<void> {
  this.listTipoDocumentoVentas = await this.tipoDocumentoService.getTipoDocumentoCompras().toPromise();
}

private async initializeSeriesCompras(): Promise<void> {
  this.listSeries = await this.tipoDocumentoService.getSeriesCompras().toPromise();
}

validarFormulario(fechaInicialInput: NgModel, fechaFinalInput: NgModel, tipoInformeInput: NgModel): void {
  if (!this.fechaInicial) {
    fechaInicialInput.control.markAsTouched();
  }

  if (!this.fechaFinal) {
    fechaFinalInput.control.markAsTouched();
  }

  if (!this.tipoInformeSeleccionado) {
    tipoInformeInput.control.markAsTouched();
  }

  if (fechaInicialInput.invalid || fechaFinalInput.invalid || tipoInformeInput.invalid) {
    return; // No continuar si hay errores
  }

  // Si todo está validado, continúa con la acción
  if (this.tipoInformeSeleccionado =='Ventas'){
    this.getInformeContableVentas();
  }

  if (this.tipoInformeSeleccionado =='Compras'){
    this.getInformeContableCompras();
  }
  
}


onTipoInformeChange(event: any): void {
  const selectedValue = event.target.value;

  if (selectedValue === 'Ventas') {
    this.initializeTipoDocumento();
    this.initializeSeries();
  } else if (selectedValue === 'Compras') {
    this.initializeTipoDocumentoCompras();
    this.initializeSeriesCompras();
  }
}

getInformeContableVentas() {
  this.spinnerService.show(); 
  const fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
  const fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')

  this.ventaService.getInformeContable(fechaInicial,fechaFinal, this.serieSeleccionada, this.tipoDocumentoSeleccionado).subscribe(
    data => {
      console.log('Datos recibidos:', data); // Agrega esto para verificar la estructura de los datos
      this.informeContableVentaInterface = data;
      if (this.informeContableVentaInterface.length === 0) {
        this.spinnerService.hide();
        Swal.fire({
          icon: 'warning',
          title: 'Sin registros',
          text: 'No se encontraron registros para exportar.',
        });
        return; // No continuar si no hay registros
      }
      
      this.exportToExcel(this.informeContableVentaInterface );
      this.spinnerService.hide();
    }
  );
}

getInformeContableCompras() {
  this.spinnerService.show(); 
  const fechaInicial = formatDate(this.fechaInicial, 'yyyyMMdd', 'en-US')
  const fechaFinal = formatDate(this.fechaFinal, 'yyyyMMdd', 'en-US')

  this.compraService.getInformeContable(fechaInicial, fechaFinal, this.tipoDocumentoSeleccionado).subscribe(
    data => {
      console.log('Datos recibidos:', data); // Agrega esto para verificar la estructura de los datos
      this.informeContableCompraInterface = data;
      if (this.informeContableCompraInterface.length === 0) {
        this.spinnerService.hide();
        Swal.fire({
          icon: 'warning',
          title: 'Sin registros',
          text: 'No se encontraron registros para exportar.',
        });
        return; // No continuar si no hay registros
      }
      
      this.exportToExcel(this.informeContableCompraInterface);
      this.spinnerService.hide();
    }
  );
}

}