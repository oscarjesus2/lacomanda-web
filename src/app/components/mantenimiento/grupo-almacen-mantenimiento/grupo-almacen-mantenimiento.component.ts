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
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { TenantTextKey } from 'src/app/services/localization/tenant-texts.en';

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
    private readonly textCatalog: TenantTextCatalogService,
    private readonly dialogRef: MatDialogRef<GrupoAlmacenMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (grupo, filtro) =>
      grupo.Descripcion.toLowerCase().includes(filtro);
    this.cargar();
  }

  /** Clave de catálogo del tipo, para que la tabla respete el idioma elegido. */
  claveTipo(tipo: TipoGrupoAlmacen): TenantTextKey {
    return tipo === 'A' ? 'groupTypeItem' : 'groupTypeSupply';
  }

  cargar(): void {
    this.service.listar(this.filtroTipo || undefined).subscribe({
      next: response => {
        if (!response.Success) {
          this.avisarError(response.Message, 'couldNotLoadWarehouseGroups');
          return;
        }
        this.dataSource.data = response.Data || [];
        this.aplicarFiltro();
      },
      error: () => this.avisarError(null, 'couldNotLoadWarehouseGroups')
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.filtro.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
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
      Swal.fire(
        this.textCatalog.get('validation'),
        this.textCatalog.get('groupDescriptionRequired'),
        'warning'
      );
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
          this.avisarError(response.Message, 'couldNotSaveGroup');
          return;
        }
        Swal.fire(
          this.textCatalog.get('saved'),
          response.Message,
          'success'
        );
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        this.avisarError(error?.error?.Message, 'couldNotSaveGroup');
      }
    });
  }

  eliminar(item: GrupoAlmacen): void {
    Swal.fire({
      title: this.textCatalog.get('deleteWarehouseGroupTitle'),
      text: item.Descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.textCatalog.get('yesDelete'),
      cancelButtonText: this.textCatalog.get('cancel')
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.service.eliminar(item.IdGrupo).subscribe({
        next: response => {
          if (response.Success) {
            Swal.fire(
              this.textCatalog.get('deleted'),
              response.Message,
              'success'
            );
            this.cargar();
          } else {
            this.avisarError(response.Message, 'couldNotDeleteGroup');
          }
        },
        error: error => this.avisarError(error?.error?.Message, 'groupInUse')
      });
    });
  }

  volver(): void {
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  /**
   * El mensaje del servidor ya viene en el idioma del tenant; la clave del
   * catálogo es el respaldo cuando no llega ninguno.
   */
  private avisarError(
    mensajeServidor: string | null | undefined,
    clave: TenantTextKey): void {
    Swal.fire(
      this.textCatalog.get('error'),
      mensajeServidor || this.textCatalog.get(clave),
      'error'
    );
  }
}
