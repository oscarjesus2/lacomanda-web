import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { Usuario } from '../../../models/usuario.models';

import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';
import { NgForm, FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { UsuarioService } from 'src/app/services/usuario.service';
import { EmpleadoService } from 'src/app/services/empleado.service';
import { Empleado } from 'src/app/models/empleado.models';
import { Nivel_UsuarioService } from 'src/app/services/nivel_usuario.service';
import { Nivel_Usuario } from 'src/app/models/nivel_usuario.models';
import { encryptPassword } from 'src/app/helpers/encryption.helper';


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
  listEmpleado: Empleado[] = [];
  listNivelUsuario: Nivel_Usuario[] = [];
  showForm: boolean = false; // Controla la visibilidad del formulario
  displayedColumns: string[] = ['username', 'niveldescripcion','activo', 'actions'];
 
  constructor(
    private dialogRef: MatDialogRef<UsuariosMantenimientoComponent >,
    private usuarioService: UsuarioService,
    private spinnerService: NgxSpinnerService,
    private empleadoService: EmpleadoService,
    private nivelUsuarioService: Nivel_UsuarioService) {}
    @ViewChild(MatPaginator) paginator: MatPaginator;

  
  hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  ngOnInit(): void {
    this.cargarusuarios();
    this.cargarEmpleados();
    this.cargarNivelUsuario();
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
  cargarEmpleados(): void {
    this.spinnerService.show();   
    this.empleadoService.getAllEmpleados().subscribe(response => {
      if (response.Success) {
        this.listEmpleado = response.Data;
        this.spinnerService.hide();
    } else {
      this.spinnerService.hide();
        Swal.fire('Error', response.Message || 'Error al cargar los empelados', 'error');
    }
    });
  }

   cargarNivelUsuario(): void {
      this.spinnerService.show();   
      this.nivelUsuarioService.getAllNivel_Usuario().subscribe(response => {
        if (response.Success) {
          this.listNivelUsuario = response.Data;
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
    const filterValue = this.filtrousuario.toLowerCase();
    this.filteredusuarios.data = this.usuarios.filter(usuario =>
      usuario.Username.toLowerCase().includes(filterValue) ||
      usuario.IdNivel.toLowerCase().includes(filterValue) ||
      usuario.IdEmpleado.toLowerCase().includes(filterValue)
    );
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

    if (this.usuario.Password) {
      this.usuario.ClaveE = encryptPassword(this.usuario.Password);
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
        this.usuarioService.createUsuario(this.usuario).subscribe(
            response => {
                if (response.Success) {
                    this.cargarusuarios();
                    this.showForm = false; // Ocultar formulario al guardar
                    Swal.fire('usuario creado', '', 'success');
                } else {
                    Swal.fire('Error', response.Message || 'Error al crear el usuario', 'error');
                }
            }
        );
    }
}


onEdit(usuario: Usuario): void {
  this.usuario = { ...usuario};
  this.showForm = true; // Mostrar formulario al editar
}

compareEmpleado(tipo1: Empleado, tipo2: Empleado): boolean {
    return tipo1 && tipo2 ? tipo1.IdEmpleado === tipo2.IdEmpleado: tipo1 === tipo2;
}

compareNivel(tipo1: Nivel_Usuario, tipo2: Nivel_Usuario): boolean {
  return tipo1 && tipo2 ? tipo1.IdNivel === tipo2.IdNivel: tipo1 === tipo2;
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
        this.usuarioService.deleteUsuario(id).subscribe(() => {
          this.cargarusuarios();
          Swal.fire('usuario eliminado', '', 'success');
        });
      }
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
