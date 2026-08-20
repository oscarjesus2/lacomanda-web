import { Component, OnInit, ViewChild } from '@angular/core';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.models';
import { TipoIdentidad } from '../../../models/tipoIdentidad.models';
import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';
import { TipoDocClienteService } from 'src/app/services/tipodoccliente.service';
import { NgForm, FormControl, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { EnumTipoIdentidad } from 'src/app/enums/enum';
import { Notificar } from 'src/app/shared/notificaciones';


@Component({
  selector: 'app-cliente-mantenimiento',
  templateUrl: './cliente-mantenimiento.component.html',
  styleUrls: ['./cliente-mantenimiento.component.css']
})
export class ClienteMantenimientoComponent implements OnInit {
  @ViewChild('clienteForm') clienteForm: NgForm;
  cliente: Cliente = new Cliente();
  clientes: Cliente[] = [];
  filteredClientes= new MatTableDataSource<Cliente>([]);
  filtroCliente: string = '';
  tiposDocCliente: TipoIdentidad[] = [];
  showForm: boolean = false; // Controla la visibilidad del formulario
  displayedColumns: string[] = ['ruc','razonSocial', 'direccion',  'correo', 'actions'];
  etiquetaCliente: string = '';

  constructor(
    private dialogRef: MatDialogRef<ClienteMantenimientoComponent >,
    private clienteService: ClienteService,
    private spinnerService: NgxSpinnerService,
    private tipoDocClienteService: TipoDocClienteService) {}
    @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
      if (value) {
        this.filteredClientes.paginator = value;
      }
    }

    
  ngOnInit(): void {
    this.cargarClientes();
    this.cargarTiposDocCliente();
  }

  cargarClientes(): void {
    this.spinnerService.show(); 
    this.clienteService.getClientes().subscribe(response => {
      if (response.Success) {
        this.clientes = response.Data;
        this.filteredClientes.data = response.Data; // Inicialmente, no se filtra nada
        this.spinnerService.hide();
    } else {
      this.spinnerService.hide();
        Swal.fire('Error', response.Message || 'Error al cargar los clientes', 'error');
    }
    });
  }

  cargarTiposDocCliente(): void {
    this.tipoDocClienteService.getTipoDocClientes().subscribe(tipoDocCliente => {
      this.tiposDocCliente = tipoDocCliente.Data;
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
    this.filteredClientes.data = this.clientes.filter(cliente =>
      cliente.RazonSocial.toLowerCase().includes(filterValue) ||
      cliente.NumeroIdentificacion.toLowerCase().includes(filterValue) ||
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

    const camposInvalidos = Object.entries(
      this.clienteForm.controls
    )
      .filter(([, control]) => control.invalid)
      .map(([nombre]) => nombre);

    console.log(
      'Campos inválidos:',
      camposInvalidos
    );

    Swal.fire({
      title: 'Formulario incompleto',
      text: 'Revisa los campos marcados en rojo.',
      icon: 'warning',
      confirmButtonText: 'Aceptar'
    });

    return;
  }

  if (this.cliente.IdCliente) {
    this.clienteService
      .updateCliente(this.cliente)
      .subscribe({
        next: response => {
          if (response.Success) {
            this.cargarClientes();
            this.showForm = false;

            Swal.fire(
              'Cliente actualizado',
              '',
              'success'
            );
          } else {
            Swal.fire(
              'Error',
              response.Message ||
                'Error al actualizar el cliente',
              'error'
            );
          }
        },
        error: error => {
          console.error(
            'Error actualizando cliente:',
            error
          );

          Swal.fire(
            'Error',
            error?.error?.Message ||
              'No se pudo actualizar el cliente.',
            'error'
          );
        }
      });

    return;
  }

  this.clienteService
    .createCliente(this.cliente)
    .subscribe({
      next: response => {
        if (response.Success) {
          this.cargarClientes();
          this.showForm = false;

          Swal.fire(
            'Cliente creado',
            '',
            'success'
          );
        } else {
          Swal.fire(
            'Error',
            response.Message ||
              'Error al crear el cliente',
            'error'
          );
        }
      },
      error: error => {
        console.error(
          'Error creando cliente:',
          error
        );

        Swal.fire(
          'Error',
          error?.error?.Message ||
            'No se pudo crear el cliente.',
          'error'
        );
      }
    });
}

buscarCliente(): void {
  const numeroIdentificacion =
    this.cliente.NumeroIdentificacion?.trim().toUpperCase();

  const idTipoIdentidad =
    this.cliente.IdTipoIdentidad;

  if (!idTipoIdentidad) {
    Swal.fire(
      'Validación',
      'Selecciona un tipo de identidad.',
      'warning'
    );

    return;
  }

  if (!numeroIdentificacion) {
    Swal.fire(
      'Validación',
      'Introduce el número de identificación.',
      'warning'
    );

    return;
  }

  const tipoIdentidad = this.tiposDocCliente.find(
    tipo => tipo.IdTipoIdentidad === idTipoIdentidad
  );

  if (
    tipoIdentidad?.RegexValidacion &&
    !new RegExp(tipoIdentidad.RegexValidacion)
      .test(numeroIdentificacion)
  ) {
    Swal.fire(
      'Validación',
      `El formato del ${
        tipoIdentidad.Abreviatura ||
        tipoIdentidad.Descripcion
      } no es válido.`,
      'warning'
    );

    return;
  }

  this.cliente.NumeroIdentificacion =
    numeroIdentificacion;

  this.clienteService
    .buscarPorIdentidad(
      numeroIdentificacion,
      idTipoIdentidad
    )
    .subscribe((clienteBuscar: any) => {
      if (clienteBuscar?.RazonSocial) {
        this.cliente.NumeroIdentificacion =
          clienteBuscar.NumeroIdentificacion ??
          numeroIdentificacion;

        this.cliente.RazonSocial =
          clienteBuscar.RazonSocial ?? '';

        this.cliente.Direccion =
          clienteBuscar.Direccion ?? '';

        this.cliente.Referencia =
          clienteBuscar.Referencia ?? '';

        this.cliente.Email =
          clienteBuscar.Email ?? '';

        return;
      }

      Swal.fire(
        'Validación',
        'No se encontró el cliente.',
        'warning'
      );
    });
}

  onEdit(cliente: Cliente): void {
  this.cliente = { ...cliente };
  this.showForm = true;

  this.onTipoIdentidadChange(
    this.cliente.IdTipoIdentidad
  );
}

  compareTiposDocCliente(tipo1: TipoIdentidad, tipo2: TipoIdentidad): boolean {
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
          Notificar.exito('Cliente eliminado', '');
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

  onTipoIdentidadChange(idTipoIdentidad: string): void {
  const tipoIdentidad = this.tiposDocCliente.find(
    tipo => tipo.IdTipoIdentidad === idTipoIdentidad
  );

  if (!tipoIdentidad) {
    this.etiquetaCliente = '';
    this.pattern = '.*';
    this.maxLength = 20;
    this.errorMessage = '';
    return;
  }

  this.etiquetaCliente =
    tipoIdentidad.Abreviatura ||
    tipoIdentidad.Descripcion;

  this.pattern = tipoIdentidad.RegexValidacion || '.*';

  switch (tipoIdentidad.IdTipoIdentidad) {
    case 'DNI':
    case 'NIE':
    case 'NIF':
      this.maxLength = 9;
      break;

    default:
      this.maxLength = 20;
      break;
  }

  this.errorMessage =
    `El formato del ${this.etiquetaCliente} no es válido.`;
}
  
}
