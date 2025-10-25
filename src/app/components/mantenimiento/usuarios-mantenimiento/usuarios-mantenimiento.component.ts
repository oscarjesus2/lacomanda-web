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
  empleadosFiltrados: Empleado[];
 
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
      // fuerza IdEmpleado a number
      this.usuarios = response.Data.map((u: any) => ({
        ...u,
        IdEmpleado: u.IdEmpleado != null ? Number(u.IdEmpleado) : null
      }));
      this.filteredusuarios.data = this.usuarios;
    } else {
      Swal.fire('Error', response.Message || 'Error al cargar los usuarios', 'error');
    }
    this.spinnerService.hide();
    this.filteredusuarios.paginator = this.paginator;
  });
}

cargarEmpleados(): void {
  this.spinnerService.show();   
  this.empleadoService.getAllEmpleados().subscribe(response => {
    if (response.Success) {
      // fuerza IdEmpleado a number
      this.listEmpleado = response.Data.map((e: any) => ({
        ...e,
        IdEmpleado: Number(e.IdEmpleado)
      }));
      this.empleadosFiltrados = this.listEmpleado;

      // si ya hay usuario cargado en edición, alinea el tipo
      if (this.usuario?.IdEmpleado != null) {
        this.usuario.IdEmpleado = Number(this.usuario.IdEmpleado);
      }
      this.spinnerService.hide();
    } else {
      this.spinnerService.hide();
      Swal.fire('Error', response.Message || 'Error al cargar los empleados', 'error');
    }
  });
}
onInputChange(valor: string) {
  this.filtrarEmpleados(valor);

  if (!valor?.trim()) {
    this.usuario.IdEmpleado = null;
  }
}

  filtrarEmpleados(valor: string) {
    const filtro = valor.toLowerCase();
    this.empleadosFiltrados = this.listEmpleado.filter(empleado =>
      empleado.Nombre.toLowerCase().includes(filtro)
    );
  }

  // onOptionSelected(empleado: any) {
  //   this.usuario.NombreEmpleado = empleado;
  //   this.usuario.IdEmpleado = empleado;
  // }

  displayEmpleado = (value: number | Empleado | null): string => {
    if (value == null) return '';
    const emp = typeof value === 'number'
      ? this.listEmpleado.find(e => e.IdEmpleado === value)
      : value;
    return emp ? emp.Nombre : '';
  };
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
      usuario.NombreUsuario.toLowerCase().includes(filterValue) ||
      usuario.NivelDescripcion.toLowerCase().includes(filterValue) ||
      usuario.NombreEmpleado.toLowerCase().includes(filterValue)
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
   this.usuario = { ...usuario, IdEmpleado: usuario.IdEmpleado != null ? Number(usuario.IdEmpleado) : null };
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
    this.empleadosFiltrados = this.listEmpleado;
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
