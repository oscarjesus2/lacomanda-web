import { Component, OnInit, ViewChild } from '@angular/core';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.models';
import { TipoDocCliente } from '../../../models/tipodoccliente.models';
import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';
import { TipoDocClienteService } from 'src/app/services/tipodoccliente.service';
import { NgForm, FormControl, Validators } from '@angular/forms';


@Component({
  selector: 'app-cliente-mantenimiento',
  templateUrl: './cliente-mantenimiento.component.html',
  styleUrls: ['./cliente-mantenimiento.component.css']
})
export class ClienteMantenimientoComponent implements OnInit {
  @ViewChild('clienteForm') clienteForm: NgForm;
  cliente: Cliente = new Cliente();
  clientes: Cliente[] = [];
  filteredClientes: Cliente[] = [];
  filtroCliente: string = '';
  tiposDocCliente: TipoDocCliente[] = [];
  showForm: boolean = false; // Controla la visibilidad del formulario
  displayedColumns: string[] = ['idCliente', 'razonSocial', 'direccion', 'ruc', 'correo', 'actions'];
  etiquetaCliente: string = '';

  constructor(
    private dialogRef: MatDialogRef<ClienteMantenimientoComponent >,
    private clienteService: ClienteService,
    private tipoDocClienteService: TipoDocClienteService) {}

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarTiposDocCliente();
  }

  cargarClientes(): void {
    this.clienteService.getClientes().subscribe(response => {
      if (response.Success) {
        this.clientes = response.Data;
        this.filteredClientes = response.Data; // Inicialmente, no se filtra nada
    } else {
        Swal.fire('Error', response.Message || 'Error al cargar los clientes', 'error');
    }
    });
  }

  cargarTiposDocCliente(): void {
    this.tipoDocClienteService.getTipoDocClientes().subscribe(tipoDocCliente => {
      this.tiposDocCliente = tipoDocCliente;
    });
  }

  nuevoCliente(): void {
    this.resetForm();
    this.showForm = true;
  }

  toggleClientesList(): void {
    this.showForm = !this.showForm;
  }

  applyFilter(): void {
    const filterValue = this.filtroCliente.toLowerCase();
    this.filteredClientes = this.clientes.filter(cliente =>
      cliente.RazonSocial.toLowerCase().includes(filterValue) ||
      cliente.Ruc.toLowerCase().includes(filterValue) ||
      cliente.Direccion.toLowerCase().includes(filterValue)
    );
  }

  private markFormTouchedAndDirty(form: NgForm): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
      control.markAsDirty();
    });
  }


  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.markFormTouchedAndDirty(this.clienteForm);
      return;
    }
    if (this.cliente.IdCliente) {
        this.clienteService.updateCliente(this.cliente).subscribe(response => {
            if (response.Success) {
                this.cargarClientes();
                this.showForm = false; // Ocultar formulario al guardar
                Swal.fire('Cliente actualizado', '', 'success');
            } else {
                Swal.fire('Error', response.Message || 'Error al actualizar el cliente', 'error');
            }
        });
    } else {
        this.clienteService.createCliente(this.cliente).subscribe(response => {
            if (response.success) {
                this.cargarClientes();
                this.showForm = false; // Ocultar formulario al guardar
                Swal.fire('Cliente creado', '', 'success');
            } else {
                Swal.fire('Error', response.message || 'Error al crear el cliente', 'error');
            }
        });
    }
}


  onEdit(cliente: Cliente): void {
    this.cliente = { ...cliente };
    this.showForm = true; // Mostrar formulario al editar
  }

  compareTiposDocCliente(tipo1: TipoDocCliente, tipo2: TipoDocCliente): boolean {
    return tipo1 && tipo2 ? tipo1.IdTipoIdentidad === tipo2.IdTipoIdentidad : tipo1 === tipo2;
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
        this.clienteService.deleteCliente(id).subscribe(() => {
          this.cargarClientes();
          Swal.fire('Cliente eliminado', '', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.cliente = new Cliente();
  }

  cancelar(): void {
    this.resetForm();
    this.showForm = false; // Ocultar formulario al cancelar
  }

  salir(): void {
    this.dialogRef.close();
  }
  
  errorMessage: string = '';
  maxLength: number = 11;
  pattern: string = '^[0-9]{8,11}$';  // Default pattern, adjusted dynamically

  onTipoIdentidadChange(tipoIdentidad): void {
    this.etiquetaCliente = tipoIdentidad.Descripcion;
    if (tipoIdentidad.Descripcion === 'DNI') {
      this.pattern = '^[0-9]{8}$';
      this.maxLength = 8;
      this.errorMessage = 'El DNI debe tener 8 dígitos.';
    } else if (tipoIdentidad.Descripcion === 'RUC') {
      this.pattern = '^[0-9]{11}$';
      this.maxLength = 11;
      this.errorMessage = 'El RUC debe tener 11 dígitos.';
    } else {
      this.pattern = '^[0-9]{8,}$';
      this.maxLength = 20;  // Set to an arbitrary large number
      this.errorMessage = 'El documento debe tener más de 8 dígitos.';
    }
  }
  
}
