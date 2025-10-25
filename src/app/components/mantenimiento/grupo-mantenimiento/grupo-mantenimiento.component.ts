import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { Grupo } from 'src/app/models/grupo.models';
import { GrupoService } from 'src/app/services/grupo.service';

@Component({
  selector: 'app-grupo-mantenimiento',
  templateUrl: './grupo-mantenimiento.component.html',
  styleUrls: ['./grupo-mantenimiento.component.css']
})
export class GrupoMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;

  grupos: Grupo[] = [];
  filtered = new MatTableDataSource<Grupo>([]);
  filtro = '';
  showForm = false;

  grupo: Grupo = { IdGrupo: 0, Descripcion: '', Activo: true };

  displayedColumns: string[] = ['descripcion', 'activo', 'actions'];

  constructor(
    private service: GrupoService,
    private dialogRef: MatDialogRef<GrupoMantenimientoComponent>
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.service.getGrupos('P').subscribe(r => {
      if (r.Success) {
        this.grupos = r.Data || [];
        this.filtered.data = this.grupos;
      } else {
        Swal.fire('Error', r.Message || 'No se pudo cargar', 'error');
      }
    });
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.filtered.data = this.grupos.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      (x.Activo ? 'activo' : 'inactivo').includes(f)
    );
  }

  nuevo(): void {
    this.grupo = { IdGrupo: 0, Descripcion: '', Activo: true };
    this.showForm = true;
  }

  onEdit(row: Grupo): void {
    this.grupo = { ...row };
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Está seguro?', text: 'No podrá revertirlo', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    }).then(s => {
      if (s.isConfirmed) {
        this.service.eliminar(id).subscribe(r => {
          if (r.Success) { this.cargar(); Swal.fire('Eliminado', '', 'success'); }
          else { Swal.fire('Error', r.Message || 'No se pudo eliminar', 'error'); }
        });
      }
    });
  }

  private touchForm(): void {
    Object.values(this.form.controls).forEach(c => { c.markAsTouched(); c.markAsDirty(); });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.touchForm(); return; }
    const obs = this.grupo.IdGrupo ? this.service.update(this.grupo) : this.service.create(this.grupo);
    obs.subscribe(r => {
      if (r.Success) {
        Swal.fire(this.grupo.IdGrupo ? 'Actualizado' : 'Guardado', '', 'success');
        this.cargar(); this.showForm = false;
      } else {
        Swal.fire('Error', r.Message || 'Operación no realizada', 'error');
      }
    });
  }

  cancelar(): void { this.showForm = false; }
  salir(): void { this.dialogRef.close(); }
}
