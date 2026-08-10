import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { MotivoSalidaMantenimiento } from 'src/app/models/motivo-salida.models';
import { MotivoSalidaService } from 'src/app/services/motivo-salida.service';

@Component({
  selector: 'app-motivo-salida-mantenimiento',
  templateUrl: './motivo-salida-mantenimiento.component.html',
  styleUrls: ['./motivo-salida-mantenimiento.component.css']
})
export class MotivoSalidaMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  dataSource = new MatTableDataSource<MotivoSalidaMantenimiento>([]);
  displayedColumns = ['descripcion', 'acciones'];
  filtro = '';
  showForm = false;
  guardando = false;
  idMotivo: number | null = null;
  descripcion = '';

  constructor(
    private readonly service: MotivoSalidaService,
    private readonly dialogRef: MatDialogRef<MotivoSalidaMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.listar().subscribe({
      next: response => {
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudieron cargar los motivos.', 'error');
          return;
        }
        this.dataSource.data = response.Data || [];
        this.aplicarFiltro();
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los motivos de salida.', 'error')
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.filtro.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  nuevo(): void {
    this.idMotivo = null;
    this.descripcion = '';
    this.showForm = true;
  }

  editar(item: MotivoSalidaMantenimiento): void {
    this.idMotivo = item.IdMotivo;
    this.descripcion = item.Descripcion;
    this.showForm = true;
  }

  guardar(): void {
    const descripcion = this.descripcion.trim();
    if (!descripcion) {
      Swal.fire('Validación', 'Ingrese la descripción del motivo.', 'warning');
      return;
    }

    this.guardando = true;
    const request = this.idMotivo == null
      ? this.service.crear({ Descripcion: descripcion })
      : this.service.actualizar(this.idMotivo, { Descripcion: descripcion });
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudo guardar el motivo.', 'error');
          return;
        }
        Swal.fire('Guardado', response.Message, 'success');
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.Message || 'No se pudo guardar el motivo.', 'error');
      }
    });
  }

  eliminar(item: MotivoSalidaMantenimiento): void {
    Swal.fire({
      title: '¿Eliminar motivo de salida?',
      text: item.Descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.service.eliminar(item.IdMotivo).subscribe({
        next: response => {
          if (response.Success) {
            Swal.fire('Eliminado', response.Message, 'success');
            this.cargar();
          } else {
            Swal.fire('Error', response.Message || 'No se pudo eliminar el motivo.', 'error');
          }
        },
        error: error => Swal.fire('No se puede eliminar', error?.error?.Message || 'El motivo está siendo utilizado.', 'error')
      });
    });
  }

  volver(): void {
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
