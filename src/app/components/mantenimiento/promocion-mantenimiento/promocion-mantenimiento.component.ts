import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
export class PromocionMantenimientoComponent implements OnInit, OnDestroy {
  private static readonly MAXIMO_BYTES_IMAGEN = 5 * 1024 * 1024;
  private static readonly TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

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
  archivoImagen: File | null = null;
  imagenPreviewUrl: string | null = null;
  nombreImagenGuardada: string | null = null;
  tieneImagenGuardada = false;
  eliminarImagenGuardada = false;

  constructor(
    private readonly service: PromocionService,
    private readonly dialogRef: MatDialogRef<PromocionMantenimientoComponent>
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.liberarPreview();
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
    this.reiniciarImagen();
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
      Activo: item.Activo
    };
    this.reiniciarImagen();
    this.nombreImagenGuardada = item.Imagen || null;
    this.tieneImagenGuardada = item.TieneImagen;
    if (item.TieneImagen) {
      this.cargarImagenGuardada(item.Correlativo);
    }
    this.showForm = true;
  }

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) {
      return;
    }

    if (!PromocionMantenimientoComponent.TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      Swal.fire('Imagen no válida', 'Seleccione una imagen JPG, PNG o WEBP.', 'warning');
      return;
    }
    if (archivo.size > PromocionMantenimientoComponent.MAXIMO_BYTES_IMAGEN) {
      Swal.fire('Imagen demasiado grande', 'La imagen no puede superar 5 MB.', 'warning');
      return;
    }

    this.liberarPreview();
    this.archivoImagen = archivo;
    this.imagenPreviewUrl = URL.createObjectURL(archivo);
    this.eliminarImagenGuardada = false;
  }

  quitarImagen(): void {
    this.liberarPreview();
    this.archivoImagen = null;
    this.eliminarImagenGuardada = this.tieneImagenGuardada;
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
        if (!response.Success) {
          this.guardando = false;
          Swal.fire('Error', response.Message || 'No se pudo guardar la promoción.', 'error');
          return;
        }
        this.guardarCambiosImagen(response.Data.Correlativo, response.Message);
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
    this.reiniciarImagen();
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
      Activo: true
    };
  }

  private cargarImagenGuardada(id: number): void {
    this.service.obtenerImagen(id).subscribe({
      next: blob => {
        this.liberarPreview();
        this.imagenPreviewUrl = URL.createObjectURL(blob);
      },
      error: () => {
        this.tieneImagenGuardada = false;
        this.nombreImagenGuardada = null;
      }
    });
  }

  private guardarCambiosImagen(id: number, mensajePromocion: string): void {
    if (this.archivoImagen) {
      this.service.guardarImagen(id, this.archivoImagen).subscribe({
        next: response => response.Success
          ? this.finalizarGuardado(mensajePromocion)
          : this.mostrarGuardadoParcial(response.Message),
        error: error => this.mostrarGuardadoParcial(error?.error?.Message)
      });
      return;
    }

    if (this.eliminarImagenGuardada) {
      this.service.eliminarImagen(id).subscribe({
        next: response => response.Success
          ? this.finalizarGuardado(mensajePromocion)
          : this.mostrarGuardadoParcial(response.Message),
        error: error => this.mostrarGuardadoParcial(error?.error?.Message)
      });
      return;
    }

    this.finalizarGuardado(mensajePromocion);
  }

  private finalizarGuardado(mensaje?: string): void {
    this.guardando = false;
    Swal.fire('Guardado', mensaje || 'Promoción guardada correctamente.', 'success');
    this.reiniciarImagen();
    this.showForm = false;
    this.cargar();
  }

  private mostrarGuardadoParcial(detalle?: string): void {
    this.guardando = false;
    Swal.fire(
      'Promoción guardada sin imagen',
      detalle || 'Los datos se guardaron, pero no fue posible actualizar la imagen. Inténtelo nuevamente.',
      'warning');
  }

  private reiniciarImagen(): void {
    this.liberarPreview();
    this.archivoImagen = null;
    this.nombreImagenGuardada = null;
    this.tieneImagenGuardada = false;
    this.eliminarImagenGuardada = false;
  }

  private liberarPreview(): void {
    if (this.imagenPreviewUrl) {
      URL.revokeObjectURL(this.imagenPreviewUrl);
      this.imagenPreviewUrl = null;
    }
  }

  private fechaFormulario(value: string | Date): string {
    const fecha = value instanceof Date ? value : new Date(value);
    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
