import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { SubFamilia } from '../../../models/subfamilia.models';
import { Familia } from '../../../models/familia.models';
import { FamiliaService } from 'src/app/services/familia.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-subfamilia-mantenimiento',
  templateUrl: './subfamilia-mantenimiento.component.html',
  styleUrls: ['./subfamilia-mantenimiento.component.css']
})
export class SubFamiliaMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;
  subfamilia: SubFamilia = new SubFamilia();
  subfamilias: SubFamilia[] = [];
  familias: Familia[] = [];
  filtered = new MatTableDataSource<SubFamilia>([]);
  filtro: string = '';
  showForm = false;

  displayedColumns: string[] = ['descripcion', 'familia', 'actions'];

  constructor(
    private familiaService: FamiliaService,
    private dialogRef: MatDialogRef<SubFamiliaMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargarFamilias();
    this.cargarSubFamilias();
  }

  cargarFamilias(): void {
    this.familiaService.getFamilias().subscribe(r => {
      if (r.Success) this.familias = r.Data;
    });
  }

  cargarSubFamilias(): void {
    this.familiaService.getSubFamilias().subscribe(r => {
      if (r.Success) {
        this.subfamilias = r.Data;
        this.filtered.data = r.Data;
      } else {
        Swal.fire('Error', r.Message || 'No se pudo cargar', 'error');
      }
    });
  }

  getFamiliaDescripcion(id: number): string {
    const f = this.familias.find(x => x.IdFamilia === id);
    return f ? f.Descripcion : '';
  }

  applyFilter(): void {
    const f = this.filtro.toLowerCase();
    this.filtered.data = this.subfamilias.filter(x =>
      x.Descripcion.toLowerCase().includes(f)
    );
  }

  nueva(): void {
    this.subfamilia = new SubFamilia();
    this.showForm = true;
  }

  onEdit(row: SubFamilia): void {
    this.subfamilia = { ...row };
    this.showForm = true;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => {
        c.markAsTouched();
        c.markAsDirty();
      });
      return;
    }

    if (this.subfamilia.IdSubFamilia) {
      this.familiaService.updateSubFamilia(this.subfamilia).subscribe(r => {
        if (r.Success) {
          Swal.fire('Actualizado', '', 'success');
          this.cargarSubFamilias();
          this.showForm = false;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo actualizar', 'error');
        }
      });
    } else {
      this.familiaService.createSubFamilia(this.subfamilia).subscribe(r => {
        if (r.Success) {
          Swal.fire('Guardado', '', 'success');
          this.cargarSubFamilias();
          this.showForm = false;
        } else {
          Swal.fire('Error', r.Message || 'No se pudo guardar', 'error');
        }
      });
    }
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'No podrá revertirlo',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) {
        this.familiaService.deleteSubFamilia(id).subscribe(resp => {
          if (resp.Success) {
            Swal.fire('Eliminado', '', 'success');
            this.cargarSubFamilias();
          } else {
            Swal.fire('Error', resp.Message || 'No se pudo eliminar', 'error');
          }
        });
      }
    });
  }

  cancelar(): void {
    this.subfamilia = new SubFamilia();
    this.showForm = false;
  }

  salir(): void {
    this.dialogRef.close();
  }
}
