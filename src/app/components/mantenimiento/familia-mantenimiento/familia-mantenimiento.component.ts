import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Familia } from '../../../models/familia.models';
import { FamiliaService } from 'src/app/services/familia.service';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-familia-mantenimiento',
  templateUrl: './familia-mantenimiento.component.html',
  styleUrls: ['./familia-mantenimiento.component.css']
})
export class FamiliaMantenimientoComponent implements OnInit {
  @ViewChild('familiaForm') familiaForm: NgForm;
  familia: Familia = new Familia();
  familias: Familia[] = [];
  filtered = new MatTableDataSource<Familia>([]);
  filtro: string = '';
  showForm = false;

  displayedColumns: string[] = ['descripcion', 'actions'];

  constructor(
    private familiaService: FamiliaService,
    private dialogRef: MatDialogRef<FamiliaMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargarFamilias();
  }

  cargarFamilias(): void {
    this.familiaService.getFamilias().subscribe(resp => {
      if (resp.Success) {
        this.familias = resp.Data;
        this.filtered.data = resp.Data;
      } else {
        Swal.fire('Error', resp.Message || 'No se pudo cargar familias', 'error');
      }
    });
  }

  applyFilter(): void {
    const f = this.filtro.toLowerCase();
    this.filtered.data = this.familias.filter(x =>
      x.Descripcion.toLowerCase().includes(f)
    );
  }

  nuevaFamilia(): void {
    this.familia = new Familia();
    this.showForm = true;
  }

  onEdit(fam: Familia): void {
    this.familia = { ...fam };
    this.showForm = true;
  }

  onSubmit(): void {
    if (this.familiaForm.invalid) {
      Object.values(this.familiaForm.controls).forEach(c => {
        c.markAsTouched();
        c.markAsDirty();
      });
      return;
    }

    if (this.familia.IdFamilia) {
      this.familiaService.updateFamilia(this.familia).subscribe(resp => {
        if (resp.Success) {
          Swal.fire('Actualizado', '', 'success');
          this.cargarFamilias();
          this.showForm = false;
        } else {
          Swal.fire('Error', resp.Message || 'No se pudo actualizar', 'error');
        }
      });
    } else {
      this.familiaService.createFamilia(this.familia).subscribe(resp => {
        if (resp.Success) {
          Swal.fire('Guardado', '', 'success');
          this.cargarFamilias();
          this.showForm = false;
        } else {
          Swal.fire('Error', resp.Message || 'No se pudo guardar', 'error');
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
        this.familiaService.deleteFamilia(id).subscribe(resp => {
          if (resp.Success) {
            Swal.fire('Eliminado', '', 'success');
            this.cargarFamilias();
          } else {
            Swal.fire('Error', resp.Message || 'No se pudo eliminar', 'error');
          }
        });
      }
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.familia = new Familia();
  }

  salir(): void {
    this.dialogRef.close();
  }
}
