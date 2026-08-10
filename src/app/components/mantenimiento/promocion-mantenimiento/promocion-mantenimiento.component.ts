import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { Promocion, PromocionGuardar } from 'src/app/models/promocion.models';
import { PromocionService } from 'src/app/services/promocion.service';

@Component({
  selector: 'app-promocion-mantenimiento',
  templateUrl: './promocion-mantenimiento.component.html',
  styleUrls: ['./promocion-mantenimiento.component.css']
})
export class PromocionMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  dataSource = new MatTableDataSource<Promocion>([]);
  displayedColumns = ['titulo', 'vigencia', 'minimo', 'estado', 'acciones'];
  filtro = '';
  showForm = false;
  guardando = false;
  cargando = false;
  correlativo: number | null = null;
  formulario: PromocionGuardar = this.nuevoFormulario();

  constructor(
    private readonly service: PromocionService,
    private readonly dialogRef: MatDialogRef<PromocionMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.listar().subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudieron cargar las promociones.', 'error');
          return;
        }
        this.dataSource.data = response.Data || [];
        this.aplicarFiltro();
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar las promociones.', 'error');
      }
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filterPredicate = (item, value) => {
      const texto = `${item.Titulo} ${item.AnuncioPrincipal} ${item.Activo ? 'activo' : 'inactivo'}`.toLowerCase();
      return texto.includes(value);
    };
    this.dataSource.filter = this.filtro.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  nueva(): void {
    this.correlativo = null;
    this.formulario = this.nuevoFormulario();
    this.showForm = true;
  }

  editar(item: Promocion): void {
    this.correlativo = item.Correlativo;
    this.formulario = {
      Titulo: item.Titulo,
      AnuncioPrincipal: item.AnuncioPrincipal,
      TerminosCondiciones: item.TerminosCondiciones,
      PrecioMinimoCompra: item.PrecioMinimoCompra,
      OfertaDesde: this.fechaFormulario(item.OfertaDesde),
      OfertaHasta: this.fechaFormulario(item.OfertaHasta),
      Imagen: item.Imagen || null,
      Activo: item.Activo
    };
    this.showForm = true;
  }

  guardar(): void {
    if (!this.formulario.Titulo.trim() ||
        !this.formulario.AnuncioPrincipal.trim() ||
        !this.formulario.TerminosCondiciones.trim() ||
        !this.formulario.OfertaDesde ||
        !this.formulario.OfertaHasta) {
      Swal.fire('Validación', 'Complete los datos obligatorios de la promoción.', 'warning');
      return;
    }

    this.guardando = true;
    const request = this.correlativo == null
      ? this.service.crear(this.formulario)
      : this.service.actualizar(this.correlativo, this.formulario);

    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudo guardar la promoción.', 'error');
          return;
        }
        Swal.fire('Guardado', response.Message || 'Promoción guardada correctamente.', 'success');
        this.showForm = false;
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.Message || 'No se pudo guardar la promoción.', 'error');
      }
    });
  }

  eliminar(item: Promocion): void {
    Swal.fire({
      title: '¿Eliminar promoción?',
      text: item.Titulo,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.service.eliminar(item.Correlativo).subscribe({
        next: response => {
          if (response.Success) {
            Swal.fire('Eliminada', response.Message, 'success');
            this.cargar();
          } else {
            Swal.fire('Error', response.Message || 'No se pudo eliminar la promoción.', 'error');
          }
        },
        error: error => Swal.fire('Error', error?.error?.Message || 'No se pudo eliminar la promoción.', 'error')
      });
    });
  }

  volver(): void {
    this.showForm = false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private nuevoFormulario(): PromocionGuardar {
    const hoy = this.fechaFormulario(new Date());
    return {
      Titulo: '',
      AnuncioPrincipal: '',
      TerminosCondiciones: '',
      PrecioMinimoCompra: 0,
      OfertaDesde: hoy,
      OfertaHasta: hoy,
      Imagen: null,
      Activo: true
    };
  }

  private fechaFormulario(value: string | Date): string {
    const fecha = value instanceof Date ? value : new Date(value);
    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
