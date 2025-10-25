import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { Estacion } from 'src/app/models/estacion.models';
import { EstacionService } from 'src/app/services/estacion.service';
import { CajaService } from 'src/app/services/caja.service';
import { Caja } from 'src/app/models/caja.models';
import { EstacionTipoEnum } from 'src/app/enums/enum';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-estacion-mantenimiento',
  templateUrl: './estacion-mantenimiento.component.html',
  styleUrls: ['./estacion-mantenimiento.component.css']
})
export class EstacionMantenimientoComponent implements OnInit {
  @ViewChild('estacionForm') estacionForm: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  estacion: Estacion = new Estacion();
  estaciones: Estacion[] = [];
  filteredEstaciones = new MatTableDataSource<Estacion>([]);
  filtro: string = '';
  showForm: boolean = false;

  listCajas: Caja[] = [];
  tipos = [
    { value: EstacionTipoEnum.MOZO, label: 'Mozo' },
    { value: EstacionTipoEnum.CAJA, label: 'Caja' }
  ];

  displayedColumns: string[] = ['descripcion', 'identificadorUnico', 'caja', 'tipo', 'actions'];
 
  cajaMap: Record<number, string> = {};
  tipoMap: Record<number, string> = { 1: 'Mozo', 2: 'Caja' };

  constructor(
    private dialogRef: MatDialogRef<EstacionMantenimientoComponent>,
    private estacionService: EstacionService,
    private cajaService: CajaService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.cargarEstaciones();
    this.cargarCajas();
  }

  ngAfterViewInit() {
    this.filteredEstaciones.paginator = this.paginator;
  }

  cargarEstaciones(): void {
    this.spinner.show();
    this.estacionService.getAll().subscribe({
      next: resp => {
        if (resp.Success) {
          this.estaciones = resp.Data;
          this.filteredEstaciones.data = resp.Data;
        } else {
          Swal.fire('Error', resp.Message || 'Error al cargar estaciones', 'error');
        }
        this.spinner.hide();
      },
      error: _ => {
        this.spinner.hide();
        Swal.fire('Error', 'No se pudieron cargar las estaciones', 'error');
      }
    });
  }

  cargarCajas(): void {
  this.cajaService.getAllCaja(false).subscribe(resp => {
    if (resp.Success) {
      this.listCajas = resp.Data;
      this.cajaMap = this.listCajas.reduce((acc, c) => {
        acc[c.IdCaja] = c.Descripcion;
        return acc;
      }, {} as Record<number, string>);
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
      e.HostName.toLowerCase().includes(filterValue)
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
    this.estacion = { ...row };
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
}
