import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  Proveedor,
  ProveedorCatalogo,
  ProveedorGuardar,
  ProveedorTipoIdentidad
} from 'src/app/models/proveedor.models';
import { ProveedorService } from 'src/app/services/proveedor.service';

@Component({
  selector: 'app-proveedor-mantenimiento',
  templateUrl: './proveedor-mantenimiento.component.html'
})
export class ProveedorMantenimientoComponent implements OnInit {
  @ViewChild('proveedorForm') proveedorForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'identificacion',
    'razonSocial',
    'contacto',
    'credito',
    'estado',
    'acciones'
  ];
  dataSource = new MatTableDataSource<Proveedor>([]);
  proveedores: Proveedor[] = [];
  catalogo: ProveedorCatalogo | null = null;
  proveedor = new ProveedorGuardar();
  idProveedorEditando: number | null = null;
  filtro = '';
  showForm = false;
  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef:
      MatDialogRef<ProveedorMantenimientoComponent>,
    private readonly proveedorService: ProveedorService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get tipoIdentidadSeleccionado(): ProveedorTipoIdentidad | null {
    return this.catalogo?.TiposIdentidad.find(
      tipo => tipo.IdTipoIdentidad === this.proveedor.IdTipoIdentidad
    ) ?? null;
  }

  get etiquetaIdentificacion(): string {
    return this.tipoIdentidadSeleccionado?.Etiqueta ||
      'Identificación fiscal';
  }

  get patronIdentificacion(): string {
    return this.tipoIdentidadSeleccionado?.RegexValidacion ?? '.*';
  }

  nuevo(): void {
    this.idProveedorEditando = null;
    this.proveedor = new ProveedorGuardar({
      IdTipoIdentidad:
        this.catalogo?.TiposIdentidad[0]?.IdTipoIdentidad ?? ''
    });
    this.showForm = true;
  }

  editar(row: Proveedor): void {
    this.idProveedorEditando = row.IdProveedor;
    this.proveedor = new ProveedorGuardar({
      IdTipoIdentidad: row.IdTipoIdentidad,
      NumeroIdentificacion: row.NumeroIdentificacion,
      RazonSocial: row.RazonSocial,
      Direccion: row.Direccion,
      IdDistrito: row.IdDistrito,
      Telefono: row.Telefono,
      Contacto: row.Contacto,
      Email: row.Email,
      IdGrupo: row.IdGrupo,
      DiasCredito: row.DiasCredito,
      Activo: row.Activo
    });
    this.showForm = true;
  }

  guardar(): void {
    if (this.proveedorForm.invalid) {
      Object.values(this.proveedorForm.controls).forEach(control => {
        control.markAsDirty();
        control.markAsTouched();
      });
      return;
    }

    const esEdicion = this.idProveedorEditando !== null;
    this.guardando = true;
    const request = esEdicion
      ? this.proveedorService.actualizar(
          this.idProveedorEditando!,
          this.proveedor
        )
      : this.proveedorService.crear(this.proveedor);

    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo guardar el proveedor.',
            'error'
          );
          return;
        }
        Swal.fire(
          esEdicion ? 'Proveedor actualizado' : 'Proveedor creado',
          '',
          'success'
        );
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar el proveedor.');
      }
    });
  }

  aplicarFiltro(): void {
    const filtro = this.normalizar(this.filtro);
    this.dataSource.data = this.proveedores.filter(proveedor =>
      [
        proveedor.NumeroIdentificacion,
        proveedor.RazonSocial,
        proveedor.Contacto,
        proveedor.Telefono,
        proveedor.Email,
        proveedor.Activo ? 'activo' : 'inactivo'
      ].some(value => this.normalizar(value).includes(filtro))
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
    forkJoin({
      proveedores: this.proveedorService.listar(),
      catalogo: this.proveedorService.catalogo()
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.proveedores.Success ||
            !response.catalogo.Success) {
          Swal.fire(
            'Error',
            response.proveedores.Message ||
              response.catalogo.Message ||
              'No se pudieron cargar los proveedores.',
            'error'
          );
          return;
        }
        this.proveedores = response.proveedores.Data || [];
        this.catalogo = response.catalogo.Data;
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error,
          'No se pudieron cargar los proveedores.'
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
      error?.error?.Message ||
        error?.error?.message ||
        fallback,
      'error'
    );
  }
}
