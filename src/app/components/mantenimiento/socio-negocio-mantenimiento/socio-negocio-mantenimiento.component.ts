import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { Producto } from 'src/app/models/product.models';
import {
  SocioNegocio,
  SocioNegocioSave
} from 'src/app/models/socionegocio.models';
import { ProductoService } from 'src/app/services/product.service';
import { SocioNegocioService } from 'src/app/services/socionegocio.service';

@Component({
  selector: 'app-socio-negocio-mantenimiento',
  templateUrl: './socio-negocio-mantenimiento.component.html',
  styleUrls: ['./socio-negocio-mantenimiento.component.css']
})
export class SocioNegocioMantenimientoComponent
  implements OnInit {
  @ViewChild('form') form: NgForm;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'descripcion',
    'comision',
    'precios',
    'estado',
    'actions'
  ];

  dataSource = new MatTableDataSource<SocioNegocio>([]);
  socios: SocioNegocio[] = [];
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  socio = this.nuevoSocio();
  precios: Record<number, number | null> = {};
  filtro = '';
  filtroProducto = '';
  showForm = false;
  cargando = false;
  guardando = false;

  constructor(
    private readonly socioService: SocioNegocioService,
    private readonly productoService: ProductoService,
    private readonly dialogRef:
      MatDialogRef<SocioNegocioMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    forkJoin({
      socios: this.socioService.getSocioNegocios(true),
      productos: this.productoService.getAllProductos()
    }).subscribe({
      next: response => {
        this.socios = (response.socios.Data ?? [])
          .map(socio => new SocioNegocio(socio));
        this.productos = (response.productos.Data ?? [])
          .filter(producto => producto.Activo)
          .sort((a, b) =>
            (a.Descripcion ?? '').localeCompare(b.Descripcion ?? '')
          );
        this.productosFiltrados = this.productos;
        this.dataSource.data = this.socios;
        this.cargando = false;
      },
      error: error => {
        this.cargando = false;
        Swal.fire(
          'Error',
          error?.error?.Message
            || 'No se pudo cargar el mantenimiento de socios.',
          'error'
        );
      }
    });
  }

  aplicarFiltro(): void {
    const value = (this.filtro ?? '').trim().toLocaleLowerCase();
    this.dataSource.data = this.socios.filter(socio =>
      socio.Descripcion.toLocaleLowerCase().includes(value)
    );
  }

  aplicarFiltroProducto(): void {
    const value = (this.filtroProducto ?? '')
      .trim()
      .toLocaleLowerCase();
    this.productosFiltrados = this.productos.filter(producto =>
      (producto.Descripcion ?? '').toLocaleLowerCase().includes(value)
      || (producto.NombreCorto ?? '').toLocaleLowerCase().includes(value)
    );
  }

  nuevo(): void {
    this.socio = this.nuevoSocio();
    this.precios = {};
    this.filtroProducto = '';
    this.productosFiltrados = this.productos;
    this.showForm = true;
  }

  editar(row: SocioNegocio): void {
    this.socio = new SocioNegocio(row);
    this.precios = {};
    for (const price of row.PreciosProductos ?? []) {
      this.precios[price.IdProducto] = Number(price.Precio);
    }

    this.filtroProducto = '';
    this.productosFiltrados = this.productos;
    this.showForm = true;
  }

  cancelar(): void {
    this.showForm = false;
    this.socio = this.nuevoSocio();
    this.precios = {};
  }

  asignarPrecio(idProducto: number, value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.precios[idProducto] = null;
      return;
    }

    const price = Number(value);
    this.precios[idProducto] =
      Number.isFinite(price) && price > 0 ? price : null;
  }

  quitarPrecio(idProducto: number): void {
    this.precios[idProducto] = null;
  }

  contarPrecios(socio: SocioNegocio): number {
    return socio.PreciosProductos?.length ?? 0;
  }

  guardar(): void {
    if (this.form?.invalid || this.guardando) {
      Object.values(this.form?.controls ?? {}).forEach(control =>
        control.markAsTouched()
      );
      return;
    }

    const dto: SocioNegocioSave = {
      Descripcion: this.socio.Descripcion.trim(),
      PorcentajeComision: Number(this.socio.PorcentajeComision),
      Activo: this.socio.Activo,
      PreciosProductos: Object.entries(this.precios)
        .filter(([, price]) => Number(price) > 0)
        .map(([idProducto, price]) => ({
          IdProducto: Number(idProducto),
          Precio: Number(price)
        }))
    };
    const editing = this.socio.IdSocioNegocio > 0;
    const request = editing
      ? this.socioService.actualizar(this.socio.IdSocioNegocio, dto)
      : this.socioService.crear(dto);

    this.guardando = true;
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo guardar el socio.',
            'error'
          );
          return;
        }

        this.showForm = false;
        Swal.fire(
          editing ? 'Socio actualizado' : 'Socio creado',
          'La configuración de precios quedó guardada.',
          'success'
        );
        this.cargar();
      },
      error: error => {
        this.guardando = false;
        Swal.fire(
          'Error',
          error?.error?.Message || 'No se pudo guardar el socio.',
          'error'
        );
      }
    });
  }

  eliminar(row: SocioNegocio): void {
    Swal.fire({
      title: '¿Eliminar socio de negocio?',
      text:
        'Solo se podrá eliminar si todavía no está asociado a pedidos, '
        + 'empleados o tarjetas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.socioService.eliminar(row.IdSocioNegocio).subscribe({
        next: () => {
          Swal.fire(
            'Socio eliminado',
            'El registro fue eliminado correctamente.',
            'success'
          );
          this.cargar();
        },
        error: error => Swal.fire(
          'No se puede eliminar',
          error?.error?.Message
            || 'El socio tiene información relacionada.',
          'warning'
        )
      });
    });
  }

  salir(): void {
    this.dialogRef.close();
  }

  private nuevoSocio(): SocioNegocio {
    return new SocioNegocio({
      IdSocioNegocio: 0,
      Descripcion: '',
      PorcentajeComision: 0,
      Activo: true,
      PreciosProductos: []
    });
  }
}
