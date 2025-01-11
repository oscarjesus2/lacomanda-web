import { Component, OnInit, ViewChild } from '@angular/core';
import { Usuario } from '../../../models/usuario.models';

import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';
import { NgForm, FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { EnumTipoIdentidad } from 'src/app/enums/enum';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CargoService } from 'src/app/services/cargo.service';
import { Cargo } from 'src/app/models/cargo.models';


@Component({
  selector: 'app-usuarios-mantenimiento',
  templateUrl: './usuarios-mantenimiento.component.html',
  styleUrls: ['./usuarios-mantenimiento.component.css']
})
export class UsuariosMantenimientoComponent implements OnInit {
  @ViewChild('usuarioForm') usuarioForm: NgForm;
  usuario: Usuario = new Usuario();
  usuarios: Usuario[] = [];
  filteredusuarios= new MatTableDataSource<Usuario>([]);
  filtrousuario: string = '';
  listCargo: Cargo[] = [];
  showForm: boolean = false; // Controla la visibilidad del formulario
  displayedColumns: string[] = ['nombre','dni', 'direccion',  'telefono', 'actions'];
  
  constructor(
    private dialogRef: MatDialogRef<UsuariosMantenimientoComponent >,
    private usuarioService: UsuarioService,
    private spinnerService: NgxSpinnerService,
    private cargoService: CargoService) {}
    @ViewChild(MatPaginator) paginator: MatPaginator;

    
  ngOnInit(): void {
    this.cargarusuarios();
    this.cargarCargos();
  }

  ngAfterViewInit() {
    this.filteredusuarios.paginator = this.paginator;
  }

  cargarusuarios(): void {
    this.spinnerService.show(); 
    this.usuarioService.getAllUsuarios().subscribe(response => {
        if (response.Success) {
            this.usuarios = response.Data;
            this.filteredusuarios.data = response.Data;
        } else {
            Swal.fire('Error', response.Message || 'Error al cargar los usuarios', 'error');
        }
        this.spinnerService.hide();
        this.filteredusuarios.paginator = this.paginator; // Reasigna el paginador
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

  nuevousuario(): void {
    this.resetForm();
    this.showForm = true;
  }

  toggleusuariosList(): void {
    this.showForm = !this.showForm;
  }

  applyFilter(): void {
    // const filterValue = this.filtrousuario.toLowerCase();
    // this.filteredusuarios.data = this.usuarios.filter(usuario =>
    //   usuario.Nombre.toLowerCase().includes(filterValue) ||
    //   usuario.Direccion.toLowerCase().includes(filterValue) ||
    //   usuario.Dni.toLowerCase().includes(filterValue)
    // );
  }

  private markFormTouchedAndDirty(form: NgForm): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
      control.markAsDirty();
    });
  }


  onSubmit(): void {
    if (this.usuarioForm.invalid) {
        this.markFormTouchedAndDirty(this.usuarioForm);
        return;
    }

    if (this.usuario.IdUsuario) {
        this.usuarioService.updateUsuario(this.usuario).subscribe(
            response => {
                if (response.Success) {
                    this.cargarusuarios();
                    this.showForm = false; // Ocultar formulario al guardar
                    Swal.fire('usuario actualizado', '', 'success');
                } else {
                    Swal.fire('Error', response.Message || 'Error al actualizar el usuario', 'error');
                }
            }
        );
    } else {
        // // this.usuarioService.createusuario(this.usuario).subscribe(
        // //     response => {
        // //         if (response.Success) {
        // //             this.cargarusuarios();
        // //             this.showForm = false; // Ocultar formulario al guardar
        // //             Swal.fire('usuario creado', '', 'success');
        // //         } else {
        // //             Swal.fire('Error', response.Message || 'Error al crear el usuario', 'error');
        // //         }
        // //     }
        // // );
    }
}


  onEdit(usuario: Usuario): void {
    this.usuario = { ...usuario};
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
      // // if (result.isConfirmed) {
      // //   this.usuarioService.deleteusuario(id).subscribe(() => {
      // //     this.cargarusuarios();
      // //     Swal.fire('usuario eliminado', '', 'success');
      // //   });
      // // }
    });
  }

  resetForm(): void {
    this.usuario = new Usuario();
  }

  cancelar(): void {
    this.resetForm();
    this.cargarusuarios(); // Recargar usuarios y actualizar el paginador
    this.showForm = false; // Ocultar formulario al cancelar
  }

  salir(): void {
    this.dialogRef.close();
  }

}
