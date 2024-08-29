import { Component, OnInit, ViewChild } from '@angular/core';
import { Empleado } from '../../../models/empleado.models';

import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';
import { NgForm, FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { EnumTipoIdentidad } from 'src/app/enums/enum';
import { EmpleadoService } from 'src/app/services/empleado.service';
import { CargoService } from 'src/app/services/cargo.service';
import { Cargo } from 'src/app/models/cargo.models';


@Component({
  selector: 'app-empleado-mantenimiento',
  templateUrl: './empleado-mantenimiento.component.html',
  styleUrls: ['./empleado-mantenimiento.component.css']
})
export class EmpleadoMantenimientoComponent implements OnInit {
  @ViewChild('empleadoForm') empleadoForm: NgForm;
  empleado: Empleado = new Empleado();
  empleados: Empleado[] = [];
  filteredEmpleados= new MatTableDataSource<Empleado>([]);
  filtroEmpleado: string = '';
  listCargo: Cargo[] = [];
  showForm: boolean = false; // Controla la visibilidad del formulario
  displayedColumns: string[] = ['nombre','dni', 'direccion',  'telefono', 'actions'];
  
  constructor(
    private dialogRef: MatDialogRef<EmpleadoMantenimientoComponent >,
    private empleadoService: EmpleadoService,
    private spinnerService: NgxSpinnerService,
    private cargoService: CargoService) {}
    @ViewChild(MatPaginator) paginator: MatPaginator;

    
  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarCargos();
  }

  ngAfterViewInit() {
    this.filteredEmpleados.paginator = this.paginator;
  }

  cargarEmpleados(): void {
    this.spinnerService.show(); 
    this.empleadoService.getAllEmpleados().subscribe(response => {
        if (response.Success) {
            this.empleados = response.Data;
            this.filteredEmpleados.data = response.Data;
        } else {
            Swal.fire('Error', response.Message || 'Error al cargar los empleados', 'error');
        }
        this.spinnerService.hide();
        this.filteredEmpleados.paginator = this.paginator; // Reasigna el paginador
    });
}
  cargarCargos(): void {
    this.spinnerService.show();   
    this.cargoService.getCargos().subscribe(response => {
      if (response.Success) {
        this.listCargo = response.Data;
        this.spinnerService.hide();
    } else {
      this.spinnerService.hide();
        Swal.fire('Error', response.Message || 'Error al cargar los cargos', 'error');
    }
    });
  }

  nuevoEmpleado(): void {
    this.resetForm();
    this.showForm = true;
  }

  toggleEmpleadosList(): void {
    this.showForm = !this.showForm;
  }

  applyFilter(): void {
    const filterValue = this.filtroEmpleado.toLowerCase();
    this.filteredEmpleados.data = this.empleados.filter(empleado =>
      empleado.Nombre.toLowerCase().includes(filterValue) ||
      empleado.Direccion.toLowerCase().includes(filterValue) ||
      empleado.Dni.toLowerCase().includes(filterValue)
    );
  }

  private markFormTouchedAndDirty(form: NgForm): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
      control.markAsDirty();
    });
  }


  onSubmit(): void {
    if (this.empleadoForm.invalid) {
        this.markFormTouchedAndDirty(this.empleadoForm);
        return;
    }

    if (this.empleado.IdEmpleado) {
        this.empleadoService.updateEmpleado(this.empleado).subscribe(
            response => {
                if (response.Success) {
                    this.cargarEmpleados();
                    this.showForm = false; // Ocultar formulario al guardar
                    Swal.fire('Empleado actualizado', '', 'success');
                } else {
                    Swal.fire('Error', response.Message || 'Error al actualizar el empleado', 'error');
                }
            }
        );
    } else {
        this.empleadoService.createEmpleado(this.empleado).subscribe(
            response => {
                if (response.Success) {
                    this.cargarEmpleados();
                    this.showForm = false; // Ocultar formulario al guardar
                    Swal.fire('Empleado creado', '', 'success');
                } else {
                    Swal.fire('Error', response.Message || 'Error al crear el empleado', 'error');
                }
            }
        );
    }
}


  onEdit(empleado: Empleado): void {
    this.empleado = { ...empleado};
    this.showForm = true; // Mostrar formulario al editar
  }

  compareCargo(tipo1: Cargo, tipo2: Cargo): boolean {
    return tipo1 && tipo2 ? tipo1.IdCargo === tipo2.IdCargo: tipo1 === tipo2;
}

  onDelete(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'No, cancelar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.empleadoService.deleteEmpleado(id).subscribe(() => {
          this.cargarEmpleados();
          Swal.fire('Empleado eliminado', '', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.empleado = new Empleado();
  }

  cancelar(): void {
    this.resetForm();
    this.cargarEmpleados(); // Recargar empleados y actualizar el paginador
    this.showForm = false; // Ocultar formulario al cancelar
  }

  salir(): void {
    this.dialogRef.close();
  }

}
