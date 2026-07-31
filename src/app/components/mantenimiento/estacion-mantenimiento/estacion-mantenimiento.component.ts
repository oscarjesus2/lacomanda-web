import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { Estacion } from 'src/app/models/estacion.models';
import { EstacionService } from 'src/app/services/estacion.service';
import { CajaService } from 'src/app/services/caja.service';
import { CajaDto } from 'src/app/models/caja.models';
import { EstacionTipoEnum } from 'src/app/enums/enum';
import { NgxSpinnerService } from 'ngx-spinner';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-estacion-mantenimiento',
  templateUrl: './estacion-mantenimiento.component.html',
  styleUrls: ['./estacion-mantenimiento.component.css']
})
export class EstacionMantenimientoComponent implements OnInit {
  @ViewChild('estacionForm') estacionForm: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.filteredEstaciones.paginator = value;
    }
  }

  estacion: Estacion = new Estacion();
  estaciones: Estacion[] = [];
  filteredEstaciones = new MatTableDataSource<Estacion>([]);
  filtro: string = '';
  showForm: boolean = false;

  listCajas: CajaDto[] = [];
  tipos: ReadonlyArray<{ value: EstacionTipoEnum; label: string }> = [];

  displayedColumns: string[] = ['descripcion', 'identificadorUnico', 'caja', 'tipo', 'actions'];

  cajaMap: Record<number, string> = {};
  tipoMap: Record<number, string> = {};

  constructor(
    private dialogRef: MatDialogRef<EstacionMantenimientoComponent>,
    private estacionService: EstacionService,
    private cajaService: CajaService,
    private spinner: NgxSpinnerService,
    private textCatalog: TenantTextCatalogService,
  ) {}

  ngOnInit(): void {
    this.inicializarTipos();
    this.cargarEstaciones();
    this.cargarCajas();
  }

  cargarEstaciones(): void {
    this.spinner.show();
    this.estacionService.getAll()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
      next: resp => {
        if (resp.Success) {
          this.estaciones = resp.Data ?? [];
          this.filteredEstaciones.data = this.estaciones;
        } else {
          Swal.fire('Error', resp.Message || 'Error al cargar estaciones', 'error');
        }
      },
      error: _ => {
        Swal.fire('Error', 'No se pudieron cargar las estaciones', 'error');
      }
    });
  }

  cargarCajas(): void {
    this.cajaService.getAllCaja(false).subscribe({
      next: resp => {
        if (resp.Success) {
          this.listCajas = resp.Data ?? [];
          this.cajaMap = this.listCajas.reduce((acc, c) => {
            acc[c.IdCaja] = c.Descripcion;
            return acc;
          }, {} as Record<number, string>);
        } else {
          Swal.fire('Error', resp.Message || 'No se pudieron cargar las cajas', 'error');
        }
      },
      error: _ => {
        Swal.fire('Error', 'No se pudieron cargar las cajas', 'error');
      }
    });
  }

  nuevo(): void {
    this.resetForm();
    this.showForm = true;
  }

  applyFilter(): void {
    const filterValue = this.filtro.toLowerCase();
    this.filteredEstaciones.data = this.estaciones.filter(e =>
      e.Descripcion.toLowerCase().includes(filterValue) ||
      e.IdentificadorUnico.toLowerCase().includes(filterValue)
    );
  }

  onSubmit(): void {
    if (this.estacionForm.invalid) {
      Object.values(this.estacionForm.controls).forEach(c => {
        c.markAsTouched();
        c.markAsDirty();
      });
      return;
    }

    if (this.estacion.IdEstacion) {
      this.estacionService.update(this.estacion).subscribe(resp => {
        if (resp.Success) {
          this.cargarEstaciones();
          this.showForm = false;
          Swal.fire('Estación actualizada', '', 'success');
        } else {
          Swal.fire('Error', resp.Message || 'Error al actualizar', 'error');
        }
      });
    } else {
      this.estacionService.create(this.estacion).subscribe(resp => {
        if (resp.Success) {
          this.cargarEstaciones();
          this.showForm = false;
          Swal.fire('Estación creada', '', 'success');
        } else {
          Swal.fire('Error', resp.Message || 'Error al crear', 'error');
        }
      });
    }
  }

  onEdit(row: Estacion): void {
    this.estacion = Object.assign(new Estacion(), {
      ...row,
      IdEstacion: Number(row.IdEstacion),
      IdCaja: Number(row.IdCaja),
      Tipo: Number(row.Tipo) as EstacionTipoEnum,
    });
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Eliminar?',
      text: 'No podrás revertir esto',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    }).then(result => {
      if (result.isConfirmed) {
        this.estacionService.delete(id).subscribe(_ => {
          this.cargarEstaciones();
          Swal.fire('Eliminada', '', 'success');
        });
      }
    });
  }

  resetForm(): void {
    this.estacion = new Estacion();
  }

  cancelar(): void {
    this.resetForm();
    this.showForm = false;
  }

  salir(): void {
    this.dialogRef.close();
  }

  private inicializarTipos(): void {
    const mozo = this.textCatalog.get('orderAttendant');

    this.tipos = [
      { value: EstacionTipoEnum.ADMINISTRADOR, label: 'Administrador' },
      { value: EstacionTipoEnum.MOZO, label: mozo },
      { value: EstacionTipoEnum.CAJA, label: 'Caja' },
    ];

    this.tipoMap = {
      [EstacionTipoEnum.ADMINISTRADOR]: 'Administrador',
      [EstacionTipoEnum.MOZO]: mozo,
      [EstacionTipoEnum.CAJA]: 'Caja',
    };
  }
}
