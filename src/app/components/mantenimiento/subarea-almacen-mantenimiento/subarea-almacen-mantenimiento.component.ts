import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  AreaAlmacenMaestro,
  SubAreaAlmacen,
  SubAreaAlmacenGuardar
} from 'src/app/models/almacen-maestro.models';
import { AreaAlmacenService } from 'src/app/services/area-almacen.service';
import { SubAreaAlmacenService } from 'src/app/services/sub-area-almacen.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-subarea-almacen-mantenimiento',
  templateUrl: './subarea-almacen-mantenimiento.component.html'
})
export class SubAreaAlmacenMantenimientoComponent implements OnInit {
  @ViewChild('subAreaForm') subAreaForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'area',
    'descripcion',
    'cuadrable',
    'estado',
    'acciones'
  ];
  dataSource = new MatTableDataSource<SubAreaAlmacen>([]);
  subAreas: SubAreaAlmacen[] = [];
  areas: AreaAlmacenMaestro[] = [];
  subArea = new SubAreaAlmacenGuardar();
  idSubAreaEditando: number | null = null;
  filtro = '';
  showForm = false;
  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef:
      MatDialogRef<SubAreaAlmacenMantenimientoComponent>,
    private readonly subAreaAlmacenService: SubAreaAlmacenService,
    private readonly areaAlmacenService: AreaAlmacenService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  nuevo(): void {
    this.idSubAreaEditando = null;
    this.subArea = new SubAreaAlmacenGuardar({
      IdAreaAlmacen: this.areas.find(area => area.Activo)?.IdArea ?? null
    });
    this.showForm = true;
  }

  editar(row: SubAreaAlmacen): void {
    this.idSubAreaEditando = row.IdSubAreaAlmacen;
    this.subArea = new SubAreaAlmacenGuardar({
      Descripcion: row.Descripcion,
      IdAreaAlmacen: row.IdAreaAlmacen,
      Cuadrable: row.Cuadrable,
      Activo: row.Activo
    });
    this.showForm = true;
  }

  guardar(): void {
    if (this.subAreaForm.invalid) {
      Object.values(this.subAreaForm.controls).forEach(control => {
        control.markAsDirty();
        control.markAsTouched();
      });
      return;
    }

    const esEdicion = this.idSubAreaEditando !== null;
    this.guardando = true;
    const request = esEdicion
      ? this.subAreaAlmacenService.actualizar(
          this.idSubAreaEditando!,
          this.subArea
        )
      : this.subAreaAlmacenService.crear(this.subArea);

    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo guardar la subárea.',
            'error'
          );
          return;
        }
        Notificar.exito(esEdicion ? 'Subárea actualizada' : 'Subárea creada',
          '');
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar la subárea.');
      }
    });
  }

  aplicarFiltro(): void {
    const filtro = this.normalizar(this.filtro);
    this.dataSource.data = this.subAreas.filter(subArea =>
      this.normalizar(subArea.Area).includes(filtro) ||
      this.normalizar(subArea.Descripcion).includes(filtro) ||
      this.normalizar(subArea.Cuadrable ? 'cuadrable' : 'no cuadrable')
        .includes(filtro) ||
      this.normalizar(subArea.Activo ? 'activo' : 'inactivo').includes(filtro)
    );
    this.dataSource.paginator?.firstPage();
  }

  areaDeshabilitada(area: AreaAlmacenMaestro): boolean {
    return !area.Activo && area.IdArea !== this.subArea.IdAreaAlmacen;
  }

  cancelar(): void {
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private cargar(): void {
    this.cargando = true;
    forkJoin({
      subAreas: this.subAreaAlmacenService.listar(),
      areas: this.areaAlmacenService.listarTodos()
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.subAreas.Success || !response.areas.Success) {
          Swal.fire(
            'Error',
            'No se pudieron cargar las áreas y subáreas de almacén.',
            'error'
          );
          return;
        }
        this.subAreas = response.subAreas.Data || [];
        this.areas = response.areas.Data || [];
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error,
          'No se pudieron cargar las áreas y subáreas de almacén.'
        );
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
