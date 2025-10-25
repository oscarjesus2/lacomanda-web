import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { AreaImpresion } from 'src/app/models/area-impresion.models';
import { AreaImpresionService } from 'src/app/services/area-impresion.service';

@Component({
  selector: 'app-area-impresion-mantenimiento',
  templateUrl: './area-impresion-mantenimiento.component.html',
  styleUrls: ['./area-impresion-mantenimiento.component.css']
})
export class AreaImpresionMantenimientoComponent implements OnInit, AfterViewInit {
  @ViewChild('areaForm') areaForm!: NgForm;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  showForm = false;

  areas: AreaImpresion[] = [];
  filtered = new MatTableDataSource<AreaImpresion>([]);
  filtro = '';

  a: AreaImpresion = { IdAreaImpresion: 0, Descripcion: '', NombreImpresora: '' };

  displayedColumns: string[] = ['descripcion', 'impresora', 'actions'];

  constructor(
    private dialogRef: MatDialogRef<AreaImpresionMantenimientoComponent>,
    private areaSrv: AreaImpresionService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void { this.filtered.paginator = this.paginator; }

  cargar(): void {
    this.spinner.show();
    this.areaSrv.listar().subscribe({
      next: list => {
        this.areas = list || [];
        this.filtered.data = this.areas;
        this.spinner.hide();
      },
      error: _ => { this.spinner.hide(); Swal.fire('Error', 'No se pudo cargar áreas', 'error'); }
    });
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.filtered.data = this.areas.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      (x.NombreImpresora || '').toLowerCase().includes(f)
    );
  }

  nuevo(): void {
    this.resetForm();
    this.showForm = true;
  }

  onEdit(row: AreaImpresion): void {
    this.a = { ...row };
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?', text: 'No podrás revertir esto!', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar!', cancelButtonText: 'No, cancelar!'
    }).then(s => {
      if (s.isConfirmed) {
        this.areaSrv.eliminar(id).subscribe({
          next: (res) => {
            if (!res.Success) { Swal.fire('Error', res.Message || 'No se pudo eliminar', 'error'); return; }
            this.cargar(); Swal.fire('Área eliminada', '', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  private markTouched(form: NgForm): void {
    Object.values(form.controls).forEach(c => { c.markAsTouched(); c.markAsDirty(); });
  }

  onSubmit(): void {
    if (this.areaForm.invalid) { this.markTouched(this.areaForm); return; }

    const obs = this.a.IdAreaImpresion
      ? this.areaSrv.actualizar(this.a)
      : this.areaSrv.crear(this.a);

    obs.subscribe({
      next: (res) => {
        if (!res.Success) { Swal.fire('Error', res.Message || 'Operación no realizada', 'error'); return; }
        this.cargar(); this.showForm = false;
        Swal.fire('Ok', this.a.IdAreaImpresion ? 'Área actualizada' : 'Área creada', 'success');
      },
      error: () => Swal.fire('Error', 'No se pudo guardar', 'error')
    });
  }

  cancelar(): void {
    this.resetForm();
    this.cargar();
    this.showForm = false;
  }

  resetForm(): void {
    this.a = { IdAreaImpresion: 0, Descripcion: '', NombreImpresora: '' };
  }

  salir(): void { this.dialogRef.close(); }
}
