import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { NgxSpinnerService } from 'ngx-spinner';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import { VentaTragoGratisDTO } from 'src/app/interfaces/ventas.interface';
import { VentaService } from 'src/app/services/venta.service';
import Swal from 'sweetalert2';
import { TurnoService } from 'src/app/services/turno.service';
import { Turno } from 'src/app/models/turno.models';
import { StorageService } from 'src/app/services/storage.service';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { EmpleadoService } from 'src/app/services/empleado.service';
import { Cargo } from 'src/app/models/cargo.models';
import { EntradaCabService } from 'src/app/services/entradacab.service';
import { Empleado } from 'src/app/models/empleado.models';
import { EntradaCab } from 'src/app/models/entradacab.models';
import { EntradaDet } from 'src/app/models/entradadet.models';
import { DescuentoCodigo } from 'src/app/models/descuentocodigo.models';
import { ImpresionDTO } from 'src/app/interfaces/impresionDTO.interface';
import { QzTrayV224Service } from 'src/app/services/qz-tray-v224.service';

@Component({
  selector: 'app-dialog-pagar-taxista',
  templateUrl: './dialog-pagar-taxista.component.html',
  styleUrls: ['./dialog-pagar-taxista.component.css']
})
export class DialogPagarTaxistaComponent {

  codigoBusqueda: string = '';
  taxistaFiltro: string = 'pendientes'; // Valores: 'pendientes' o 'todos'
  idEmpleado: string = '';
  dni: string = '';
  nombres: string = '';
  placa: string = '';
  telefono: string = '';
  color: string = 'rojo';
  totalPagar: number = 0;

  // Tabla de datos
  displayedColumns: string[] = ['tipoDoc', 'serie', 'numero', 'importe', 'dscto', 'total', 'codigoPromo', 'activo', 'fechaReg'];
  dataSource = new MatTableDataSource<VentaTragoGratisDTO>;
  turnoAbierto: Turno;

  constructor(
    public dialogRef: MatDialogRef<DialogPagarTaxistaComponent>,
    private ventaService: VentaService,
    private TurnoService: TurnoService,
    private spinnerService: NgxSpinnerService,
    private storageService: StorageService,
    private router: Router,
    private empleadoService: EmpleadoService,
    private entradaCabService: EntradaCabService,
    private qzTrayService: QzTrayV224Service
  ) { }


  async ngOnInit() {

    this.spinnerService.show();

    try {
      // Primer servicio que necesita ejecutarse antes de otros
      this.TurnoService.ObtenerTurnoByIP(this.storageService.getCurrentIP()).subscribe(data => {
        if (data != null) {
          this.turnoAbierto = data;

          this.listarTragosGratis();
          this.spinnerService.hide();
        } else {
          // Si no hay turno abierto
          this.spinnerService.hide();
          Swal.fire({
            icon: 'warning',
            title: 'No hay un turno abierto para ' + this.storageService.getCurrentIP(),
            text: 'El componente se cerrará.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            if (this.storageService.getCurrentUser().IdNivel == "001") {
              this.router.navigate(['/dashboard']);
            } else {
              this.storageService.logout();
            }
          });
        }
      });
    } catch (error) {
      console.log(error);
      this.spinnerService.hide();
      this.salir();
    }
  }

  validarDNI(): void {
    const dni = this.dni;

    if (dni.length >= 8) {
      // Llamamos al servicio para buscar el taxista por DNI
      this.empleadoService.getAllEmpleados().subscribe({
        next: (response) => {
          if (response.Success && response.Data.length > 0) {
            const taxista = response.Data.find(x => x.Dni == dni);
            if (taxista) {
              this.idEmpleado=taxista.IdEmpleado;
              this.nombres = taxista.Nombre;
              this.placa = taxista.Placa;
              this.telefono = taxista.Telefono;
              this.color = taxista.Color;
            } else {
              Swal.fire('Información', 'No se encontró al taxista en la base de datos.', 'info');
              this.dni == dni;
            }

          }
        },
        error: (error) => {
          Swal.fire('Error', 'Ocurrió un error al buscar el taxista.', 'error');
        }
      });
    } else if (this.dni.trim() !== '') {
      Swal.fire('Validación', 'Ingrese un número de DNI correcto.', 'warning');
      this.limpiarCampos();
    }
  }

  limpiarCampos(): void {
    this.idEmpleado='';
    this.dni = '';
    this.nombres = '';
    this.placa = '';
    this.telefono = '';
    this.color = '';
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
  
  salir() {
    this.dialogRef.close();
  }
  selectedRow: VentaTragoGratisDTO;

  selectRow(row: any) {
    this.selectedRow = row; // Asigna la fila seleccionada a la propiedad
    let sTotalPagar = 0;
    sTotalPagar = this.selectedRow.Total; // Asegúrate de que "total" es el campo correcto

    // Redondear a 2 decimales
    this.totalPagar = Math.round(sTotalPagar * 100) / 100;
  }

  pagarTaxista(form: NgForm): void {
    if (this.taxistaFiltro === 'pendientes') {
      // Validaciones
      if (!this.dni.trim()) {
        Swal.fire('Validación', 'Debe Ingresar el DNI del Taxista.', 'warning');
        return;
      }

      if (!this.nombres.trim()) {
        Swal.fire('Validación', 'Debe Ingresar los Nombres del Taxista.', 'warning');
        return;
      }

      if (!this.placa.trim()) {
        Swal.fire('Validación', 'Debe ingresar la placa del auto del Taxista.', 'warning');
        return;
      }

      if (!this.telefono.trim()) {
        Swal.fire('Validación', 'Debe ingresar el teléfono del Taxista.', 'warning');
        return;
      }

      if (!this.color.trim()) {
        Swal.fire('Validación', 'Debe ingresar el color del auto del Taxista.', 'warning');
        return;
      }

      if (isNaN(this.totalPagar) || this.totalPagar <= 0) {
        Swal.fire('Validación', 'El Total a Pagar debe ser mayor a cero y un valor numérico.', 'warning');
        return;
      }

    
      var  empleado = new Empleado();
      empleado.IdEmpleado = this.idEmpleado;
      empleado.Nombre= this.nombres;
      empleado.Dni = this.dni;
      empleado.Telefono= this.telefono;
      empleado.Direccion= null;  // Verificar si se necesita un valor por defecto
      empleado.Cargo= new Cargo({ IdCargo: '015', Descripcion: '' }); // Asegúrate de que Cargo está definido correctamente
      empleado.Activo = 1;  // O 1 si Activo es un número
      empleado.IdSocioNegocio = 0;
      empleado.Placa = this.placa;
      empleado.Color = this.color;

      var entrada = new EntradaCab();
      entrada.NumDocumento = "RI";
      entrada.IdTipoDocumento = "RI";
      entrada.FechaEmision = this.turnoAbierto.FechaTrabajo;
      entrada.FechaRecepcion = this.turnoAbierto.FechaTrabajo;
      entrada.IdProveedor = "00001";
      entrada.IdTipoMovi = 8;
      entrada.IdSubTipoMovi = 3;
      entrada.IdMoneda = "SO";
      entrada.ValorCompra = this.totalPagar;
      entrada.Isc = 0;
      entrada.Igv = 0;
      entrada.TotalCompra = this.totalPagar;
      entrada.Observacion = "COMISION TAXISTA " + empleado.Nombre + " / PLACA " +  empleado.Placa + " / COLOR " + empleado.Color;
      entrada.IdTienda = 'backend';
      entrada.MontoPagado = 0;
      entrada.IdTipoCambio = 0;
      entrada.TasaCambio = 0;
      entrada.FechaPago = null;
      entrada.Calculo = 1;
      entrada.IdCaja = this.turnoAbierto.IdCaja;
      entrada.IdTurno = this.turnoAbierto.IdTurno;
      entrada.Opcion = 1;
      entrada.UsuReg = this.storageService.getCurrentUser().IdUsuario;
      entrada.IdEmpleado = this.storageService.getCurrentUser().IdEmpleado;
      entrada.NumGastoDia = 0;
      entrada.Estado = 2;
      entrada.EstadoPago = 1;

      var listaEntradaDet: EntradaDet[] = [];
      var entradaDet= new EntradaDet();

      entradaDet.IdEntrada = 0;
      entradaDet.IdArticulo = 838;
      entradaDet.Cantidad = 1;
      entradaDet.Precio = this.totalPagar;
      entradaDet.IdUnidad = "UN";
      entradaDet.ValorCompra = this.totalPagar;
      entradaDet.PorcIsc = 0;
      entradaDet.Isc = 0;
      entradaDet.PorcIgv = 0;
      entradaDet.Igv = 0;
      entradaDet.Subtotal = this.totalPagar;
      entradaDet.IdImpuesto = null;
      entradaDet.IdImpuesto2 = null;
      entradaDet.IdArea = null;
      listaEntradaDet.push(entradaDet);

      entrada.ListaEntradaDet = listaEntradaDet;


      this.spinnerService.show();
      this.entradaCabService.GrabarEgresoTaxista(empleado, entrada, this.selectedRow.IdVenta).subscribe({
        next: (response) => {
          // Manejar la respuesta del servidor
          if (response.Success) {
            Swal.fire('Éxito', 'Se grabaron los datos correctamente.', 'success');
            this.imprimir(response.Data);
            this.limpiarFormulario();
            this.listarTragosGratis(); // Refrescar la lista de tragos gratis
          } else {
            Swal.fire('Error', 'Hubo un problema al actualizar los datos del taxista.', 'error');
          }
        }
      });
      this.spinnerService.hide();
    }
  }

  // Método para limpiar el formulario
  limpiarFormulario(): void {
    this.dni = '';
    this.nombres = '';
    this.placa = '';
    this.telefono = '';
    this.color = '';
    this.totalPagar = 0;
  }

  listarTragosGratis(): void {
    const idTurno = this.turnoAbierto.IdTurno; // Cambiar según sea necesario o tomarlo de alguna variable de la aplicación
    this.ventaService.getVentaTragoGratisPorTurno(idTurno).subscribe({
      next: (response: ApiResponse<VentaTragoGratisDTO[]>) => {
        if (response.Success) {
          this.dataSource.data = response.Data; // Asigna los datos al dataSource de la tabla
        } else {
          console.error('Error al obtener los datos:', response.Message);
        }
      },
      error: (error) => {
        console.error('Error en la solicitud', error);
      }
    });
  }

  // Métodos adicionales para gestionar el formulario, buscar, etc.
}