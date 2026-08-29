import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { Tarjeta, TarjetaGuardar } from 'src/app/models/tarjeta.models';
import { SocioNegocio } from 'src/app/models/socionegocio.models';
import { TarjetaService } from 'src/app/services/tarjeta.service';
import { SocioNegocioService } from 'src/app/services/socionegocio.service';
import { Notificar } from 'src/app/shared/notificaciones';

@Component({
  selector: 'app-tarjeta-mantenimiento',
  templateUrl: './tarjeta-mantenimiento.component.html',
  styleUrls: ['./tarjeta-mantenimiento.component.css']
})
export class TarjetaMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.data.paginator = value;
    }
  }

  tarjeta: Tarjeta = this.blank();
  rows: Tarjeta[] = [];
  data = new MatTableDataSource<Tarjeta>([]);
  sociosNegocio: SocioNegocio[] = [];
  filtro = '';
  showForm = false;
  guardando = false;

  displayedColumns = ['descripcion', 'socio', 'orden', 'actions'];

  constructor(
    private service: TarjetaService,
    private socioNegocioService: SocioNegocioService,
    private dialogRef: MatDialogRef<TarjetaMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarSociosNegocio();
  }

  private blank(): Tarjeta {
    return new Tarjeta({
      IdTarjeta: 0,
      Descripcion: '',
      IdSocioNegocio: null,
      Orden: null,
    });
  }

  // ── Carga ──────────────────────────────────────────────────

  cargar(): void {
    this.service.getTarjeta().subscribe({
      next: r => {
        this.rows = r ?? [];
        this.aplicarFiltro();
      },
      error: _ => Swal.fire('Error', 'No se pudieron cargar las tarjetas', 'error')
    });
  }

  private cargarSociosNegocio(): void {
    this.socioNegocioService.getSocioNegocios().subscribe({
      next: r => this.sociosNegocio = r?.Data ?? [],
      // El socio es opcional: si no se puede cargar, el alta sigue siendo util.
      error: _ => this.sociosNegocio = []
    });
  }

  socioLabel(idSocioNegocio?: number | null): string {
    if (idSocioNegocio == null) return '—';
    return this.sociosNegocio.find(s => s.IdSocioNegocio === idSocioNegocio)?.Descripcion
      ?? `#${idSocioNegocio}`;
  }

  aplicarFiltro(): void {
    const f = (this.filtro || '').toLowerCase();
    this.data.data = this.rows.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      this.socioLabel(x.IdSocioNegocio).toLowerCase().includes(f)
    );
  }

  // ── CRUD ───────────────────────────────────────────────────

  nuevo(): void {
    this.tarjeta = this.blank();
    this.showForm = true;
  }

  onEdit(row: Tarjeta): void {
    this.tarjeta = new Tarjeta({ ...row });
    this.showForm = true;
  }

  onDelete(row: Tarjeta): void {
    Swal.fire({
      title: '¿Eliminar tarjeta?',
      text: `Se eliminará "${row.Descripcion}". No podrás revertir esta acción.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed) return;

      this.service.eliminarTarjeta(row.IdTarjeta).subscribe({
        next: r => {
          if (r.Success) {
            Notificar.exito('Eliminada', 'La tarjeta fue eliminada.');
            this.cargar();
          } else {
            Swal.fire('No se puede eliminar', r.Message || 'Error al eliminar', 'warning');
          }
        },
        error: e => Swal.fire(
          'No se puede eliminar',
          e?.error?.Message || 'Está asociada a pagos registrados.',
          'warning'
        )
      });
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.tarjeta = this.blank();
  }

  // ── Submit ─────────────────────────────────────────────────

  private touchForm(): void {
    if (!this.form) return;
    Object.values(this.form.controls).forEach(c => {
      c.markAsTouched();
      c.markAsDirty();
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.touchForm();
      return;
    }
    if (this.guardando) {
      return;
    }

    const dto: TarjetaGuardar = {
      Descripcion: (this.tarjeta.Descripcion || '').trim(),
      IdSocioNegocio: this.tarjeta.IdSocioNegocio ?? null,
      Orden: this.tarjeta.Orden ?? null,
    };

    const esEdicion = !!this.tarjeta.IdTarjeta;
    const op$ = esEdicion
      ? this.service.actualizarTarjeta(this.tarjeta.IdTarjeta, dto)
      : this.service.crearTarjeta(dto);

    this.guardando = true;
    op$.subscribe({
      next: r => {
        this.guardando = false;
        if (r.Success) {
          Notificar.exito(esEdicion ? 'Actualizada' : 'Guardada', '');
          this.cargar();
          this.showForm = false;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo guardar', 'error');
        }
      },
      error: e => {
        this.guardando = false;
        Swal.fire('Error', e?.error?.Message || 'No se pudo guardar', 'error');
      }
    });
  }

  salir(): void {
    this.dialogRef.close();
  }
}
