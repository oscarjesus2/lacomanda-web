import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import {
  AreaAlmacenGuardar,
  AreaAlmacenMaestro
} from 'src/app/models/almacen-maestro.models';
import { AreaAlmacenService } from 'src/app/services/area-almacen.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-area-almacen-mantenimiento',
  templateUrl: './area-almacen-mantenimiento.component.html'
})
export class AreaAlmacenMantenimientoComponent implements OnInit {
  @ViewChild('areaForm') areaForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = ['descripcion', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<AreaAlmacenMaestro>([]);
  areas: AreaAlmacenMaestro[] = [];
  area = new AreaAlmacenGuardar();
  idAreaEditando: number | null = null;
  filtro = '';
  showForm = false;
  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<AreaAlmacenMantenimientoComponent>,
    private readonly areaAlmacenService: AreaAlmacenService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  nuevo(): void {
    this.idAreaEditando = null;
    this.area = new AreaAlmacenGuardar();
    this.showForm = true;
  }

  editar(row: AreaAlmacenMaestro): void {
    this.idAreaEditando = row.IdArea;
    this.area = new AreaAlmacenGuardar({
      Descripcion: row.Descripcion,
      Activo: row.Activo
    });
    this.showForm = true;
  }

  guardar(): void {
    if (this.areaForm.invalid) {
      Object.values(this.areaForm.controls).forEach(control => {
        control.markAsDirty();
        control.markAsTouched();
      });
      return;
    }

    const esEdicion = this.idAreaEditando !== null;
    this.guardando = true;
    const request = esEdicion
      ? this.areaAlmacenService.actualizar(this.idAreaEditando!, this.area)
      : this.areaAlmacenService.crear(this.area);

    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo guardar el área de almacén.',
            'error'
          );
          return;
        }
        Notificar.exito(esEdicion ? 'Área actualizada' : 'Área creada',
          '');
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar el área de almacén.');
      }
    });
  }

  aplicarFiltro(): void {
    const filtro = this.normalizar(this.filtro);
    this.dataSource.data = this.areas.filter(area =>
      this.normalizar(area.Descripcion).includes(filtro) ||
      this.normalizar(area.Activo ? 'activo' : 'inactivo').includes(filtro)
    );
    this.dataSource.paginator?.firstPage();
  }

  cancelar(): void {
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private cargar(): void {
    this.cargando = true;
    this.areaAlmacenService.listarTodos().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudieron cargar las áreas de almacén.',
            'error'
          );
          return;
        }
        this.areas = response.Data || [];
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar las áreas de almacén.');
      }
    });
  }

  private normalizar(value: unknown): string {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire(
      'Error',
      error?.error?.Message || error?.error?.message || fallback,
      'error'
    );
  }
}
