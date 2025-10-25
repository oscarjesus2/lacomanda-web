import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { Observacion } from 'src/app/models/observacion.models';
import { ObservacionService } from 'src/app/services/observacion.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-observacion-mantenimiento',
  templateUrl: './observacion-mantenimiento.component.html',
  styleUrls: ['./observacion-mantenimiento.component.css']
})
export class ObservacionMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  // Parametrizable "en duro"
  readonly ROWS = 5;
  readonly COLS = 5;

  tipos = [
    { value: 1, label: 'Comida' },
    { value: 2, label: 'Bebida' },
  ];

  obs: Observacion = this.blank();
  rows: Observacion[] = [];
  data = new MatTableDataSource<Observacion>([]);
  filtro = '';
  showForm = false;

  // posiciones ocupadas por el tipo seleccionado
  usedPositions = new Set<number>();

  displayedColumns = ['descripcion','tipo','posicion','activo','actions'];

  constructor(private service: ObservacionService,
    private dialogRef: MatDialogRef<ObservacionMantenimientoComponent>
  ) {}

  ngOnInit(): void { this.cargar(); }

  ngAfterViewInit() { this.data.paginator = this.paginator; }

  private blank(): Observacion {
    return { IdObservacion: 0, Descripcion: '', Tipo: 1, Activo: 1, Posicion: 0 };
  }

  cargar(): void {
    this.service.getAllObservacion().subscribe({
      next: r => {
        if (r.Success) {
          this.rows = r.Data ?? [];
          this.data.data = this.rows;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo cargar', 'error');
        }
      },
      error: _ => Swal.fire('Error', 'No se pudo cargar', 'error')
    });
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.data.data = this.rows.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      (x.Tipo === 1 ? 'comida' : 'bebida').includes(f) ||
      String(x.Posicion).includes(f)
    );
  }

  nuevo(): void {
    this.obs = this.blank();
    this.showForm = true;
    this.refreshUsedPositions();
  }

  onEdit(r: Observacion): void {
    this.obs = { ...r };
    this.showForm = true;
    this.refreshUsedPositions();
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Eliminar?', text: 'No podrás revertir esto', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.service.eliminar(id).subscribe(resp => {
          if (resp.Success) {
            this.cargar();
            Swal.fire('Eliminado', '', 'success');
          } else {
            Swal.fire('Error', resp.Message || 'No se pudo eliminar', 'error');
          }
        });
      }
    });
  }

  cancelar(): void { this.showForm = false; }

  // --- Botonera ---
  onTipoChange(): void { this.refreshUsedPositions(); }

  refreshUsedPositions(): void {
    this.usedPositions.clear();
    const tipo = this.obs.Tipo;
    // carga posiciones actuales del tipo (desde memoria o API)
    const ocupadas = this.rows.filter(x => x.Tipo === tipo).map(x => x.Posicion);
    for (const p of ocupadas) this.usedPositions.add(p);
    // si estamos editando, permitir su propia posición
    if (this.obs.IdObservacion && this.obs.Posicion) this.usedPositions.delete(this.obs.Posicion);
  }

  isOccupied(pos: number): boolean { return this.usedPositions.has(pos); }

  selectPos(pos: number): void {
    if (this.isOccupied(pos)) return;
    this.obs.Posicion = pos;
  }

  posLabel(pos: number): string { return String(pos); }

  // --- Submit ---
  private touchForm(): void {
    Object.values(this.form.controls).forEach(c => { c.markAsTouched(); c.markAsDirty(); });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.obs.Posicion) {
      this.touchForm();
      if (!this.obs.Posicion) Swal.fire('Posición', 'Selecciona una posición libre en la botonera', 'warning');
      return;
    }
    const obs$ = this.obs.IdObservacion ? this.service.actualizar(this.obs) : this.service.crear(this.obs);
    obs$.subscribe({
      next: r => {
        if (r.Success) {
          Swal.fire(this.obs.IdObservacion ? 'Actualizado' : 'Guardado', '', 'success');
          this.cargar();
          this.showForm = false;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo guardar', 'error');
        }
      },
      error: e => Swal.fire('Error', e?.error?.Message || 'No se pudo guardar', 'error')
    });
  }

  // helpers para mostrar texto simple en tabla (evitar funciones flecha en template)
  tipoLabel(t: number): string { return t === 1 ? 'Comida' : 'Bebida'; }
  estadoLabel(a: number): string { return a === 1 ? 'Sí' : 'No'; }

   salir(): void { this.dialogRef.close(); }
}
