import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { NgForm } from '@angular/forms';

import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { Ambiente } from 'src/app/models/ambiente.models';
import { AmbienteService } from 'src/app/services/ambiente.service';
// Reutiliza el selector genérico de posiciones:
import { PosicionSelectorDialogComponent, PosicionSelectorData } from '../../posicion-selector-dialog/posicion-selector-dialog.component';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';

@Component({
  selector: 'app-ambiente-mantenimiento',
  templateUrl: './ambiente-mantenimiento.component.html',
  styleUrls: ['./ambiente-mantenimiento.component.css']
})
export class AmbienteMantenimientoComponent implements OnInit, AfterViewInit {
  @ViewChild('ambienteForm') ambienteForm: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  showForm = false;

  ambientes: Ambiente[] = [];
  filteredAmbientes = new MatTableDataSource<Ambiente>([]);
  filtro = '';

  ambiente: Ambiente = new Ambiente();
  displayedColumns: string[] = ['descripcion', 'estado', 'posicion', 'actions'];
  descripcionesEjemplo = ['Terraza','Salón','Barra','Lounge','Patio', 'VIP'];
  // Grid 1x10 “en duro” por ahora
  readonly GRID_ROWS = 1;
  readonly GRID_COLS = 10;

  constructor(
    private dialogRef: MatDialogRef<AmbienteMantenimientoComponent>,
    private dialog: MatDialog,
    private ambienteService: AmbienteService,
    private spinner: NgxSpinnerService
  ){}

  ngOnInit(): void {
    this.cargarAmbientes();
  }

  ngAfterViewInit(): void {
    this.filteredAmbientes.paginator = this.paginator;
  }

  cargarAmbientes(): void {
    this.spinner.show();
    this.ambienteService.getAllAmbiente().subscribe({
      next: (res: ApiResponse<Ambiente[]>) => {
        if (res.Success) {
          this.ambientes = res.Data || [];
          this.filteredAmbientes.data = this.ambientes;
        } else {
          Swal.fire('Error', res.Message || 'Error al cargar ambientes', 'error');
        }
        this.spinner.hide();
        this.filteredAmbientes.paginator = this.paginator;
      },
      error: () => {
        this.spinner.hide();
        Swal.fire('Error', 'No se pudo cargar ambientes', 'error');
      }
    });
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.filteredAmbientes.data = this.ambientes.filter(a =>
      (a.Descripcion || '').toLowerCase().includes(f) ||
      String(a.Posicion || '').includes(f) ||
      (a.Estado === 1 ? 'activo' : 'inactivo').includes(f)
    );
  }

  nuevo(): void {
    this.resetForm();
    this.showForm = true;
  }

  onEdit(a: Ambiente): void {
    this.ambiente = { ...a };
    this.showForm = true;
  }

  onDelete(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'No, cancelar!'
    }).then(r => {
      if (r.isConfirmed) {
        this.ambienteService.deleteAmbiente(id).subscribe({
          next: (res) => {
            if ((res as any).Success === false) {
              Swal.fire('Error', (res as any).Message || 'No se pudo eliminar', 'error');
              return;
            }
            this.cargarAmbientes();
            Swal.fire('Ambiente eliminado', '', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  abrirSelectorPosicion(): void {
    // Posiciones ocupadas (excluye la del ambiente en edición)
    const ocupadas = this.ambientes
      .filter(a => !this.ambiente.IdAmbiente || a.IdAmbiente !== this.ambiente.IdAmbiente)
      .map(a => a.Posicion);

    const data: PosicionSelectorData = {
      rows: this.GRID_ROWS,
      cols: this.GRID_COLS,
      occupied: ocupadas,
      initial: this.ambiente.Posicion || null
    };

    const ref = this.dialog.open(PosicionSelectorDialogComponent, {
      width: '560px',
      data
    });

    ref.afterClosed().subscribe((pos: number | null) => {
      if (pos) this.ambiente.Posicion = pos;
    });
  }

  private markFormTouchedAndDirty(form: NgForm): void {
    Object.values(form.controls).forEach(c => {
      c.markAsTouched();
      c.markAsDirty();
    });
  }

  onSubmit(): void {
    // Validar posición no ocupada (front) — el back debe validar también
    if (!this.ambiente.Posicion) {
      Swal.fire('Validación', 'Debe elegir una posición (1 a 10).', 'info');
      return;
    }
    const ocupada = this.ambientes.some(a =>
      a.Posicion === this.ambiente.Posicion &&
      a.IdAmbiente !== this.ambiente.IdAmbiente
    );
    if (ocupada) {
      Swal.fire('Validación', 'La posición ya está ocupada por otro ambiente.', 'info');
      return;
    }

    if (this.ambienteForm.invalid) {
      this.markFormTouchedAndDirty(this.ambienteForm);
      return;
    }

    if (this.ambiente.IdAmbiente) {
      this.ambienteService.updateAmbiente(this.ambiente).subscribe({
        next: (res) => {
          if ((res as any).Success === false) {
            Swal.fire('Error', (res as any).Message || 'Error al actualizar', 'error');
            return;
          }
          this.cargarAmbientes();
          this.showForm = false;
          Swal.fire('Ambiente actualizado', '', 'success');
        },
        error: () => Swal.fire('Error', 'No se pudo actualizar', 'error')
      });
    } else {
      this.ambienteService.createAmbiente(this.ambiente).subscribe({
        next: (res) => {
          if ((res as any).Success === false) {
            Swal.fire('Error', (res as any).Message || 'Error al crear', 'error');
            return;
          }
          this.cargarAmbientes();
          this.showForm = false;
          Swal.fire('Ambiente creado', '', 'success');
        },
        error: () => Swal.fire('Error', 'No se pudo crear', 'error')
      });
    }
  }

  cancelar(): void {
    this.resetForm();
    this.cargarAmbientes();
    this.showForm = false;
  }

  resetForm(): void {
    this.ambiente = new Ambiente();
    // Por defecto: Activo
    this.ambiente.Estado = 1;
    this.ambiente.Posicion = undefined as any;
  }

  salir(): void {
    this.dialogRef.close();
  }
}
