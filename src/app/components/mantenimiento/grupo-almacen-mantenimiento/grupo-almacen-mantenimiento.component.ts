import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import {
  GrupoAlmacen,
  TIPOS_GRUPO_ALMACEN,
  TipoGrupoAlmacen,
} from 'src/app/models/grupo-almacen.models';
import { GrupoAlmacenService } from 'src/app/services/grupo-almacen.service';

@Component({
  selector: 'app-grupo-almacen-mantenimiento',
  templateUrl: './grupo-almacen-mantenimiento.component.html',
  styleUrls: ['./grupo-almacen-mantenimiento.component.css']
})
export class GrupoAlmacenMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly tipos = TIPOS_GRUPO_ALMACEN;

  dataSource = new MatTableDataSource<GrupoAlmacen>([]);
  displayedColumns = ['descripcion', 'tipo', 'estado', 'acciones'];
  filtro = '';
  filtroTipo: TipoGrupoAlmacen | '' = '';
  showForm = false;
  guardando = false;
  idGrupo: number | null = null;
  descripcion = '';
  tipoGrupo: TipoGrupoAlmacen = 'I';
  activo = true;

  constructor(
    private readonly service: GrupoAlmacenService,
    private readonly dialogRef: MatDialogRef<GrupoAlmacenMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (grupo, filtro) =>
      grupo.Descripcion.toLowerCase().includes(filtro);
    this.cargar();
  }

  cargar(): void {
    this.service.listar(this.filtroTipo || undefined).subscribe({
      next: response => {
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudieron cargar los grupos.', 'error');
          return;
        }
        this.dataSource.data = response.Data || [];
        this.aplicarFiltro();
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los grupos de almacén.', 'error')
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.filtro.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  etiquetaTipo(tipo: TipoGrupoAlmacen): string {
    return this.tipos.find(x => x.valor === tipo)?.etiqueta ?? tipo;
  }

  nuevo(): void {
    this.idGrupo = null;
    this.descripcion = '';
    this.tipoGrupo = this.filtroTipo || 'I';
    this.activo = true;
    this.showForm = true;
  }

  editar(item: GrupoAlmacen): void {
    this.idGrupo = item.IdGrupo;
    this.descripcion = item.Descripcion;
    this.tipoGrupo = item.TipoGrupo;
    this.activo = item.Activo;
    this.showForm = true;
  }

  guardar(): void {
    const descripcion = this.descripcion.trim();
    if (!descripcion) {
      Swal.fire('Validación', 'Ingrese la descripción del grupo.', 'warning');
      return;
    }

    this.guardando = true;
    const dto = {
      Descripcion: descripcion,
      Activo: this.activo,
      TipoGrupo: this.tipoGrupo,
    };
    const request = this.idGrupo == null
      ? this.service.crear(dto)
      : this.service.actualizar(this.idGrupo, dto);
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudo guardar el grupo.', 'error');
          return;
        }
        Swal.fire('Guardado', response.Message, 'success');
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.Message || 'No se pudo guardar el grupo.', 'error');
      }
    });
  }

  eliminar(item: GrupoAlmacen): void {
    Swal.fire({
      title: '¿Eliminar grupo de almacén?',
      text: item.Descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.service.eliminar(item.IdGrupo).subscribe({
        next: response => {
          if (response.Success) {
            Swal.fire('Eliminado', response.Message, 'success');
            this.cargar();
          } else {
            Swal.fire('Error', response.Message || 'No se pudo eliminar el grupo.', 'error');
          }
        },
        error: error => Swal.fire('No se puede eliminar', error?.error?.Message || 'El grupo está siendo utilizado.', 'error')
      });
    });
  }

  volver(): void {
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
