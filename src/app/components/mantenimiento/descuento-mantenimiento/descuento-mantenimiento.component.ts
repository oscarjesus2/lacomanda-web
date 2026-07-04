import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { Descuento, DescuentoCreateDto } from 'src/app/models/descuento.models';
import { DescuentoService } from 'src/app/services/descuento.service';
import { TipoDescuentoEnum } from 'src/app/enums/enum';

@Component({
  selector: 'app-descuento-mantenimiento',
  templateUrl: './descuento-mantenimiento.component.html',
  styleUrls: ['./descuento-mantenimiento.component.css']
})
export class DescuentoMantenimientoComponent implements OnInit, AfterViewInit {
  @ViewChild('form') form: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  readonly tipoDescuentoEnum = TipoDescuentoEnum;

  tiposDescuento = [
    { value: TipoDescuentoEnum.PorProducto, label: 'Por Producto' },
    { value: TipoDescuentoEnum.Total,       label: 'Total' },
    { value: TipoDescuentoEnum.Vale,        label: 'Vale' },
  ];

  descuento: Descuento = this.blank();
  rows: Descuento[] = [];
  data = new MatTableDataSource<Descuento>([]);
  filtro = '';
  showForm = false;

  displayedColumns = ['descripcion', 'tipo', 'porcentaje', 'activo', 'actions'];

  constructor(
    private service: DescuentoService,
    private dialogRef: MatDialogRef<DescuentoMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.data.paginator = this.paginator;
  }

  private blank(): Descuento {
    return new Descuento({ IdDescuento: 0, Descripcion: '', Porcentaje: 0, TipoDescuento: TipoDescuentoEnum.PorProducto, Activo: true });
  }

  // ── Getters de utilidad ────────────────────────────────────

  get esVale(): boolean {
    return Number(this.descuento.TipoDescuento) === TipoDescuentoEnum.Vale;
  }

  tipoLabel(tipo: number): string {
    return this.tiposDescuento.find(t => t.value === Number(tipo))?.label ?? '—';
  }

  // ── Carga ──────────────────────────────────────────────────

  cargar(): void {
    this.service.getDescuentos().subscribe({
      next: r => {
        if (r.Success) {
          this.rows = (r.Data ?? []).map(d => ({
            ...d,
            TipoDescuento: Number(d.TipoDescuento),
          }));
          this.data.data = this.rows;
          this.data.paginator = this.paginator;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo cargar', 'error');
        }
      },
      error: _ => Swal.fire('Error', 'No se pudo cargar los descuentos', 'error')
    });
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.data.data = this.rows.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      this.tipoLabel(x.TipoDescuento).toLowerCase().includes(f)
    );
  }

  // ── CRUD ───────────────────────────────────────────────────

  nuevo(): void {
    this.descuento = this.blank();
    this.showForm = true;
  }

  onEdit(row: Descuento): void {
    this.descuento = { ...row, TipoDescuento: Number(row.TipoDescuento) };
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Eliminar descuento?',
      text: 'No podrás revertir esta acción.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.service.eliminarDescuento(id).subscribe({
          next: r => {
            if (r.Success) {
              Swal.fire('Eliminado', 'El descuento fue eliminado.', 'success');
              this.cargar();
            } else {
              Swal.fire('No se puede eliminar', r.Message || 'Error al eliminar', 'warning');
            }
          },
          error: e => Swal.fire('No se puede eliminar', e?.error?.Message || 'Está asociado a ventas o pedidos.', 'warning')
        });
      }
    });
  }

  onToggleActivo(row: Descuento): void {
    if (row.Activo) {
      // desactivar vía PATCH
      this.service.desactivarDescuento(row.IdDescuento).subscribe({
        next: r => {
          if (r.Success) { this.cargar(); }
          else { Swal.fire('Error', r.Message || 'No se pudo desactivar', 'error'); }
        },
        error: e => Swal.fire('Error', e?.error?.Message || 'No se pudo desactivar', 'error')
      });
    } else {
      // reactivar vía PUT
      const dto: DescuentoCreateDto = {
        Descripcion: row.Descripcion,
        Porcentaje: row.Porcentaje,
        TipoDescuento: row.TipoDescuento,
        Activo: true
      };
      this.service.actualizarDescuento(row.IdDescuento, dto).subscribe({
        next: r => {
          if (r.Success) { this.cargar(); }
          else { Swal.fire('Error', r.Message || 'No se pudo activar', 'error'); }
        },
        error: e => Swal.fire('Error', e?.error?.Message || 'No se pudo activar', 'error')
      });
    }
  }

  cancelar(): void {
    this.showForm = false;
    this.descuento = this.blank();
  }

  // ── Submit ─────────────────────────────────────────────────

  private touchForm(): void {
    if (!this.form) return;
    Object.values(this.form.controls).forEach(c => {
      c.markAsTouched();
      c.markAsDirty();
    });
  }

  onTipoChange(): void {
    if (this.esVale) {
      this.descuento.Porcentaje = 0;
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.touchForm();
      return;
    }

    const dto: DescuentoCreateDto = {
      Descripcion: this.descuento.Descripcion,
      Porcentaje: this.esVale ? 0 : this.descuento.Porcentaje,
      TipoDescuento: Number(this.descuento.TipoDescuento),
      Activo: this.descuento.Activo
    };

    const op$ = this.descuento.IdDescuento
      ? this.service.actualizarDescuento(this.descuento.IdDescuento, dto)
      : this.service.crearDescuento(dto);

    op$.subscribe({
      next: r => {
        if (r.Success) {
          Swal.fire(this.descuento.IdDescuento ? 'Actualizado' : 'Guardado', '', 'success');
          this.cargar();
          this.showForm = false;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo guardar', 'error');
        }
      },
      error: e => Swal.fire('Error', e?.error?.Message || 'No se pudo guardar', 'error')
    });
  }

  salir(): void {
    this.dialogRef.close();
  }
}
