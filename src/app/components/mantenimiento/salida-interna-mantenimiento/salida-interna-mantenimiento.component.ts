import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  SalidaInterna,
  SalidaInternaArticulo,
  SalidaInternaCatalogos,
  SalidaInternaDetalleGuardar,
  SalidaInternaGuardar,
  SalidaInternaResumen
} from 'src/app/models/salida-interna.models';
import { SalidaInternaService } from 'src/app/services/salida-interna.service';
import { Notificar } from 'src/app/shared/notificaciones';

interface SalidaInternaLinea extends SalidaInternaDetalleGuardar {
  Producto: string;
  Unidad: string;
  CantidadEnStock: number;
}

@Component({
  selector: 'app-salida-interna-mantenimiento',
  templateUrl: './salida-interna-mantenimiento.component.html'
})
export class SalidaInternaMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'numero', 'fecha', 'subarea', 'motivo', 'articulos', 'estado', 'acciones'
  ];

  dataSource = new MatTableDataSource<SalidaInternaResumen>([]);
  catalogos: SalidaInternaCatalogos | null = null;
  salida: SalidaInterna | null = null;
  formulario: SalidaInternaGuardar = this.formularioInicial();
  lineas: SalidaInternaLinea[] = [];
  filtro = {
    FechaInicio: this.inicioMes(),
    FechaFin: new Date(),
    Estado: null as number | null,
    Buscar: ''
  };
  idArticuloAgregar: number | null = null;
  idUnidadAgregar: number | null = null;
  unidadesArticuloAgregar: Array<{ Id: number; Descripcion: string }> = [];
  idSubAreaAnterior: number | null = null;
  cantidadAgregar = 1;
  showForm = false;
  soloLectura = false;
  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<SalidaInternaMantenimientoComponent>,
    private readonly salidaInternaService: SalidaInternaService
  ) {}

  ngOnInit(): void {
    this.cargarInicial();
  }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({
      catalogos: this.salidaInternaService.catalogos(),
      salidas: this.salidaInternaService.listar(this.filtro)
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.catalogos.Success || !response.salidas.Success) {
          Swal.fire(
            'No se pudo iniciar',
            response.catalogos.Message || response.salidas.Message ||
              'No se pudieron cargar las salidas internas.',
            'error'
          );
          return;
        }
        this.catalogos = response.catalogos.Data;
        this.dataSource.data = response.salidas.Data || [];
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudieron cargar las salidas internas.');
      }
    });
  }

  buscar(): void {
    this.cargando = true;
    this.salidaInternaService.listar(this.filtro).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudo realizar la búsqueda.', 'error');
          return;
        }
        this.dataSource.data = response.Data || [];
        this.dataSource.paginator?.firstPage();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo realizar la búsqueda.');
      }
    });
  }

  nuevo(): void {
    this.salida = null;
    this.formulario = this.formularioInicial();
    this.formulario.IdMotivo = this.catalogos?.Motivos[0]?.Id || null;
    this.formulario.IdSubAreaAlmacen = this.catalogos?.SubAreas[0]?.Id || null;
    this.idSubAreaAnterior = this.formulario.IdSubAreaAlmacen;
    this.lineas = [];
    this.limpiarLinea();
    this.soloLectura = false;
    this.showForm = true;
  }

  abrir(row: SalidaInternaResumen): void {
    this.cargando = true;
    this.salidaInternaService.obtener(row.IdSalida).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('Error', response.Message || 'No se pudo abrir la salida interna.', 'error');
          return;
        }
        this.cargarFormulario(response.Data);
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo abrir la salida interna.');
      }
    });
  }

  cambiarSubArea(): void {
    const nuevaSubArea = this.formulario.IdSubAreaAlmacen;
    if (this.lineas.length === 0) {
      this.idSubAreaAnterior = nuevaSubArea;
      this.limpiarLinea();
      return;
    }
    this.formulario.IdSubAreaAlmacen = this.idSubAreaAnterior;
    Swal.fire({
      title: 'Cambiar subárea',
      text: 'Al cambiar la subárea se quitarán los artículos agregados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.formulario.IdSubAreaAlmacen = nuevaSubArea;
        this.idSubAreaAnterior = nuevaSubArea;
        this.lineas = [];
        this.limpiarLinea();
      }
    });
  }

  seleccionarArticulo(): void {
    const articulo = this.articuloAgregar;
    if (!articulo) {
      this.idUnidadAgregar = null;
      this.unidadesArticuloAgregar = [];
      return;
    }

    const unidades = [
      { Id: articulo.IdUnidadStock, Descripcion: articulo.UnidadStock }
    ];
    if (articulo.IdUnidadReceta &&
        articulo.IdUnidadReceta !== articulo.IdUnidadStock &&
        articulo.FactorReceta > 0) {
      unidades.push({
        Id: articulo.IdUnidadReceta,
        Descripcion: articulo.UnidadReceta
      });
    }

    this.unidadesArticuloAgregar = unidades;
    this.idUnidadAgregar = articulo.IdUnidadStock;
  }

  agregarLinea(): void {
    const articulo = this.articuloAgregar;
    if (!articulo || !this.idUnidadAgregar) {
      Swal.fire('Falta el artículo', 'Seleccione el artículo y la unidad de salida.', 'info');
      return;
    }
    if (this.lineas.some(linea => linea.IdProducto === articulo.IdProducto)) {
      Swal.fire('Artículo repetido', 'El artículo ya está incluido en la salida.', 'info');
      return;
    }
    if (!Number.isFinite(Number(this.cantidadAgregar)) || Number(this.cantidadAgregar) <= 0) {
      Swal.fire('Cantidad incorrecta', 'Ingrese una cantidad mayor que cero.', 'info');
      return;
    }

    const usaReceta = this.idUnidadAgregar === articulo.IdUnidadReceta;
    const factor = usaReceta ? Number(articulo.FactorReceta) : 1;
    const cantidadEnStock = usaReceta
      ? Number((Number(this.cantidadAgregar) / factor).toFixed(3))
      : Number(this.cantidadAgregar);
    this.lineas = [...this.lineas, {
      IdProducto: articulo.IdProducto,
      IdUnidadMedida: this.idUnidadAgregar,
      Cantidad: Number(this.cantidadAgregar),
      Producto: articulo.Descripcion,
      Unidad: usaReceta ? articulo.UnidadReceta : articulo.UnidadStock,
      CantidadEnStock: cantidadEnStock
    }];
    this.limpiarLinea();
  }

  quitarLinea(index: number): void {
    this.lineas.splice(index, 1);
    this.lineas = [...this.lineas];
  }

  guardar(): void {
    if (!this.formularioValido()) {
      return;
    }
    const dto: SalidaInternaGuardar = {
      ...this.formulario,
      IdSubAreaAlmacen: Number(this.formulario.IdSubAreaAlmacen),
      IdMotivo: Number(this.formulario.IdMotivo),
      Detalles: this.lineas.map(linea => ({
        IdProducto: linea.IdProducto,
        IdUnidadMedida: linea.IdUnidadMedida,
        Cantidad: Number(linea.Cantidad)
      }))
    };
    this.guardando = true;
    const request = this.salida
      ? this.salidaInternaService.actualizar(this.salida.IdSalida, dto)
      : this.salidaInternaService.crear(dto);
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('No se pudo guardar', response.Message || 'Revise los datos de la salida.', 'error');
          return;
        }
        this.cargarFormulario(response.Data);
        Notificar.exito('Salida generada',
          'Revísela para descontar el stock y registrar el Kardex.');
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar la salida interna.');
      }
    });
  }

  revisar(): void {
    if (!this.salida || this.salida.Estado !== 1) {
      return;
    }
    Swal.fire({
      title: 'Revisar salida interna',
      text: 'Se descontará el stock de la subárea y se registrará la salida en Kardex.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Revisar y aplicar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !this.salida) {
        return;
      }
      this.ejecutarAccion(
        this.salidaInternaService.revisar(this.salida.IdSalida),
        'Salida revisada',
        'El stock y el Kardex fueron actualizados.'
      );
    });
  }

  anular(): void {
    if (!this.salida || this.salida.Estado === 3) {
      return;
    }
    const revisada = this.salida.Estado === 2;
    Swal.fire({
      title: 'Anular salida interna',
      text: revisada
        ? 'Se repondrá el stock y se inactivarán los movimientos de Kardex.'
        : 'La salida se conservará como anulada sin modificar el stock.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular salida',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-button--danger' }
    }).then(result => {
      if (!result.isConfirmed || !this.salida) {
        return;
      }
      this.ejecutarAccion(
        this.salidaInternaService.anular(this.salida.IdSalida),
        'Salida anulada',
        revisada ? 'El stock fue repuesto y el Kardex quedó inactivo.' : ''
      );
    });
  }

  volver(): void {
    this.showForm = false;
    this.salida = null;
    this.buscar();
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  get articulosDisponibles(): SalidaInternaArticulo[] {
    const idSubArea = Number(this.formulario.IdSubAreaAlmacen);
    const agregados = new Set(this.lineas.map(linea => linea.IdProducto));
    return (this.catalogos?.Articulos || []).filter(articulo =>
      articulo.IdsSubAreaAlmacen.includes(idSubArea) &&
      !agregados.has(articulo.IdProducto)
    );
  }

  get articuloAgregar(): SalidaInternaArticulo | undefined {
    return this.catalogos?.Articulos.find(
      articulo => articulo.IdProducto === this.idArticuloAgregar
    );
  }

  private ejecutarAccion(
    request: Observable<ApiResponse<SalidaInterna>>,
    titulo: string,
    mensaje: string
  ): void {
    this.guardando = true;
    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('Error', response.Message || 'No se pudo completar la operación.', 'error');
          return;
        }
        this.cargarFormulario(response.Data);
        Notificar.exito(titulo, mensaje);
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo completar la operación.');
      }
    });
  }

  private cargarFormulario(salida: SalidaInterna): void {
    this.salida = salida;
    this.formulario = {
      IdSubAreaAlmacen: salida.IdSubAreaAlmacen,
      IdMotivo: salida.IdMotivo,
      Fecha: new Date(salida.Fecha),
      Observacion: salida.Observacion,
      Detalles: []
    };
    this.idSubAreaAnterior = salida.IdSubAreaAlmacen;
    this.lineas = salida.Detalles.map(detalle => ({
      IdProducto: detalle.IdProducto,
      IdUnidadMedida: detalle.IdUnidadSeleccionada,
      Cantidad: detalle.Cantidad,
      Producto: detalle.Producto,
      Unidad: detalle.UnidadSeleccionada,
      CantidadEnStock: detalle.CantidadEnStock
    }));
    this.soloLectura = salida.Estado !== 1;
    this.showForm = true;
    this.limpiarLinea();
  }

  private formularioValido(): boolean {
    if (!this.formulario.IdSubAreaAlmacen || !this.formulario.IdMotivo ||
        !this.formulario.Fecha || this.lineas.length === 0) {
      Swal.fire(
        'Complete la salida',
        'Seleccione subárea, motivo, fecha y agregue al menos un artículo.',
        'info'
      );
      return false;
    }
    return true;
  }

  private limpiarLinea(): void {
    this.idArticuloAgregar = null;
    this.idUnidadAgregar = null;
    this.unidadesArticuloAgregar = [];
    this.cantidadAgregar = 1;
  }

  private formularioInicial(): SalidaInternaGuardar {
    return {
      IdSubAreaAlmacen: null,
      IdMotivo: null,
      Fecha: new Date(),
      Observacion: '',
      Detalles: []
    };
  }

  private inicioMes(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire(
      'Error',
      error?.error?.Message || error?.error?.message || fallback,
      'error'
    );
  }
}
