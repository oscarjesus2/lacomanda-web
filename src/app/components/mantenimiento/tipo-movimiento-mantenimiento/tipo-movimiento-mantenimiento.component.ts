import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import {
  SubTipoMovimientoGuardar,
  SubTipoMovimientoMantenimiento,
  TipoMovimientoGuardar,
  TipoMovimientoMantenimiento,
} from 'src/app/models/tipo-movimiento.models';
import { TipoMovimientoService } from 'src/app/services/tipo-movimiento.service';
import { Notificar } from 'src/app/shared/notificaciones';

type TipoFormulario = 'tipo' | 'subtipo' | null;

@Component({
  selector: 'app-tipo-movimiento-mantenimiento',
  templateUrl: './tipo-movimiento-mantenimiento.component.html',
})
export class TipoMovimientoMantenimientoComponent implements OnInit {
  readonly displayedColumns = ['descripcion', 'subtipos', 'acciones'];
  readonly displayedColumnsSubTipos = ['descripcion', 'estado', 'acciones'];
  tipos: TipoMovimientoMantenimiento[] = [];
  tipoSeleccionado: TipoMovimientoMantenimiento | null = null;
  filtro = '';
  cargando = false;
  guardando = false;
  tipoFormulario: TipoFormulario = null;
  idTipoEditando: number | null = null;
  idSubTipoEditando: number | null = null;
  descripcion = '';
  activo = true;

  constructor(
    private readonly dialogRef:
      MatDialogRef<TipoMovimientoMantenimientoComponent>,
    private readonly tipoMovimientoService: TipoMovimientoService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get tiposFiltrados(): TipoMovimientoMantenimiento[] {
    const filtro = this.normalizar(this.filtro);
    if (!filtro) {
      return this.tipos;
    }

    return this.tipos.filter(tipo =>
      this.normalizar(tipo.Descripcion).includes(filtro) ||
      tipo.SubTipos.some(subTipo =>
        this.normalizar(subTipo.Descripcion).includes(filtro)),
    );
  }

  nuevoTipo(): void {
    this.tipoFormulario = 'tipo';
    this.idTipoEditando = null;
    this.idSubTipoEditando = null;
    this.descripcion = '';
    this.activo = true;
  }

  editarTipo(tipo: TipoMovimientoMantenimiento): void {
    this.tipoFormulario = 'tipo';
    this.idTipoEditando = tipo.IdTipoMovimiento;
    this.idSubTipoEditando = null;
    this.descripcion = tipo.Descripcion;
    this.activo = true;
  }

  seleccionarTipo(tipo: TipoMovimientoMantenimiento): void {
    this.tipoSeleccionado = tipo;
  }

  nuevoSubTipo(): void {
    if (!this.tipoSeleccionado) {
      return;
    }

    this.tipoFormulario = 'subtipo';
    this.idTipoEditando = null;
    this.idSubTipoEditando = null;
    this.descripcion = '';
    this.activo = true;
  }

  editarSubTipo(subTipo: SubTipoMovimientoMantenimiento): void {
    this.tipoFormulario = 'subtipo';
    this.idTipoEditando = null;
    this.idSubTipoEditando = subTipo.IdSubTipoMovimiento;
    this.descripcion = subTipo.Descripcion;
    this.activo = subTipo.Activo;
  }

  guardar(): void {
    const descripcion = this.descripcion.trim();
    if (!descripcion || !this.tipoFormulario) {
      Swal.fire('Validación', 'Ingrese la descripción.', 'warning');
      return;
    }

    this.guardando = true;
    if (this.tipoFormulario === 'tipo') {
      this.guardarTipo(descripcion);
      return;
    }

    this.guardarSubTipo(descripcion);
  }

  eliminarTipo(tipo: TipoMovimientoMantenimiento): void {
    Swal.fire({
      title: '¿Eliminar tipo de movimiento?',
      text: tipo.Descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then(resultado => {
      if (!resultado.isConfirmed) {
        return;
      }

      this.tipoMovimientoService.eliminarTipo(tipo.IdTipoMovimiento).subscribe({
        next: response => {
          if (!response.Success) {
            this.mostrarError(response.Message);
            return;
          }

          if (this.tipoSeleccionado?.IdTipoMovimiento === tipo.IdTipoMovimiento) {
            this.tipoSeleccionado = null;
          }
          Notificar.exito('Tipo eliminado', response.Message);
          this.cargar();
        },
        error: error => this.mostrarError(error?.error?.Message),
      });
    });
  }

  eliminarSubTipo(subTipo: SubTipoMovimientoMantenimiento): void {
    Swal.fire({
      title: '¿Eliminar subtipo de movimiento?',
      text: subTipo.Descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then(resultado => {
      if (!resultado.isConfirmed) {
        return;
      }

      this.tipoMovimientoService.eliminarSubTipo(
        subTipo.IdSubTipoMovimiento,
      ).subscribe({
        next: response => {
          if (!response.Success) {
            this.mostrarError(response.Message);
            return;
          }

          Notificar.exito('Subtipo eliminado', response.Message);
          this.cargar();
        },
        error: error => this.mostrarError(error?.error?.Message),
      });
    });
  }

  cancelar(): void {
    this.tipoFormulario = null;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private cargar(): void {
    const idSeleccionado = this.tipoSeleccionado?.IdTipoMovimiento;
    this.cargando = true;
    this.tipoMovimientoService.listar().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }

        this.tipos = response.Data || [];
        this.tipoSeleccionado = this.tipos.find(
          tipo => tipo.IdTipoMovimiento === idSeleccionado,
        ) || this.tipos[0] || null;
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error?.error?.Message);
      },
    });
  }

  private guardarTipo(descripcion: string): void {
    const dto: TipoMovimientoGuardar = { Descripcion: descripcion };
    const request = this.idTipoEditando === null
      ? this.tipoMovimientoService.crearTipo(dto)
      : this.tipoMovimientoService.actualizarTipo(this.idTipoEditando, dto);
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }

        this.tipoFormulario = null;
        Notificar.exito('Guardado', response.Message);
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error?.error?.Message);
      },
    });
  }

  private guardarSubTipo(descripcion: string): void {
    if (!this.tipoSeleccionado) {
      this.guardando = false;
      return;
    }

    const dto: SubTipoMovimientoGuardar = {
      Descripcion: descripcion,
      Activo: this.activo,
    };
    const request = this.idSubTipoEditando === null
      ? this.tipoMovimientoService.crearSubTipo(
        this.tipoSeleccionado.IdTipoMovimiento,
        dto,
      )
      : this.tipoMovimientoService.actualizarSubTipo(
        this.idSubTipoEditando,
        dto,
      );
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          this.mostrarError(response.Message);
          return;
        }

        this.tipoFormulario = null;
        Notificar.exito('Guardado', response.Message);
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error?.error?.Message);
      },
    });
  }

  private normalizar(valor: unknown): string {
    return String(valor || '').trim().toLocaleLowerCase();
  }

  private mostrarError(mensaje: string | undefined): void {
    Swal.fire(
      'Error',
      mensaje || 'No se pudo completar la operación.',
      'error',
    );
  }
}
