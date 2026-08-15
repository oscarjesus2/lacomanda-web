import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  EntradaCompra,
  EntradaCompraArticulo,
  EntradaCompraCatalogos,
  EntradaCompraGuardar,
  EntradaCompraImpuesto,
  EntradaCompraLineaGuardar,
  EntradaCompraPago,
  EntradaCompraPagoGuardar,
  EntradaCompraResumen,
  EntradaCompraSubMovimiento,
  CuotaDocumentosCompraIa,
  FacturaCompraIaPrevisualizacion
} from 'src/app/models/entrada-compra.models';
import { EntradaCompraService } from 'src/app/services/entrada-compra.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import {
  ProveedorCatalogo,
  ProveedorGuardar
} from 'src/app/models/proveedor.models';
import { ProveedorService } from 'src/app/services/proveedor.service';

interface LineaCompraEdicion
  extends Omit<EntradaCompraLineaGuardar, 'IdProducto'> {
  IdProducto: number | null;
  Producto: string;
  UnidadMedida: string;
  Inventariable: boolean;
  OrigenIa?: boolean;
  CodigoOriginal?: string;
  DescripcionOriginal?: string;
  UnidadMedidaOriginal?: string;
  CantidadOriginal?: number;
  FactorConversionUnidad?: number;
  ConfianzaIa?: number;
  RequiereRevision?: boolean;
  MotivoRevision?: string;
}

@Component({
  selector: 'app-entrada-compra-mantenimiento',
  templateUrl: './entrada-compra-mantenimiento.component.html'
})
export class EntradaCompraMantenimientoComponent implements OnInit {
  private static readonly MAXIMO_DOCUMENTO_IA_BYTES = 8 * 1024 * 1024;
  private static readonly TIPOS_DOCUMENTO_IA_PERMITIDOS = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'seleccion',
    'documento',
    'recepcion',
    'proveedor',
    'movimiento',
    'total',
    'estadoPago',
    'estado',
    'acciones'
  ];
  readonly detalleColumns = [
    'producto',
    'cantidad',
    'unidad',
    'precio',
    'subarea',
    'impuestos',
    'base',
    'tributos',
    'total',
    'acciones'
  ];

  dataSource = new MatTableDataSource<EntradaCompraResumen>([]);
  catalogos: EntradaCompraCatalogos | null = null;
  compra: EntradaCompra | null = null;
  formulario: EntradaCompraGuardar = this.formularioInicial();
  lineas: LineaCompraEdicion[] = [];
  filtro = {
    FechaInicio: this.inicioMes(),
    FechaFin: new Date(),
    CampoFecha: 'recepcion',
    Estado: null as number | null,
    Buscar: ''
  };

  idArticuloAgregar: number | null = null;
  cantidadAgregar = 1;
  importeAgregar = 0;
  idSubAreaAgregar: number | null = null;
  impuestosAgregar: string[] = [];
  pago: EntradaCompraPagoGuardar = this.pagoInicial();
  fechaPagoProgramada: Date | null = null;
  idsGuiasSeleccionadas = new Set<number>();
  notaOrigen: EntradaCompra | null = null;
  tipoNotaCreacion: 1 | 2 = 1;
  tipoAjusteNota: 1 | 2 = 1;
  cargando = false;
  guardando = false;
  showForm = false;
  soloLectura = false;
  facturaIaHabilitada = false;
  cuotaFacturaIa: CuotaDocumentosCompraIa | null = null;
  procesandoFactura = false;
  previsualizacionFactura: FacturaCompraIaPrevisualizacion | null = null;
  catalogoProveedor: ProveedorCatalogo | null = null;
  proveedorNuevo = new ProveedorGuardar();

  constructor(
    private readonly dialogRef:
      MatDialogRef<EntradaCompraMantenimientoComponent>,
    private readonly entradaCompraService: EntradaCompraService,
    private readonly licenciaTenantService: LicenciaTenantService,
    private readonly proveedorService: ProveedorService
  ) {}

  ngOnInit(): void {
    this.cargarInicial();
    this.cargarLicenciaFacturaIa();
  }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({
      catalogos: this.entradaCompraService.catalogos(),
      compras: this.entradaCompraService.listar(this.filtro),
      catalogoProveedor: this.proveedorService.catalogo()
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.catalogos.Success ||
            !response.compras.Success ||
            !response.catalogoProveedor.Success) {
          Swal.fire(
            'No se pudo iniciar',
            response.catalogos.Message ||
              response.compras.Message ||
              response.catalogoProveedor.Message ||
              'No se pudieron cargar los ingresos de compras.',
            'error'
          );
          return;
        }

        this.catalogos = response.catalogos.Data;
        this.catalogoProveedor = response.catalogoProveedor.Data;
        this.dataSource.data = response.compras.Data || [];
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(
          error,
          'No se pudieron cargar los ingresos de compras.'
        );
      }
    });
  }

  buscar(): void {
    this.cargando = true;
    this.entradaCompraService.listar(this.filtro).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo realizar la búsqueda.',
            'error'
          );
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
    if (!this.catalogos) {
      return;
    }

    this.compra = null;
    this.notaOrigen = null;
    this.formulario = this.formularioInicial();
    this.formulario.IdMoneda =
      this.catalogos.IdMonedaPredeterminada ||
      this.catalogos.Monedas[0]?.Id ||
      '';
    this.formulario.IdTipoDocumento =
      this.tiposDocumentoDisponibles[0]?.Id || '';
    const movimiento = this.catalogos.TiposMovimiento[0];
    this.formulario.IdTipoMovimiento =
      movimiento?.IdTipoMovimiento ?? null;
    this.formulario.IdSubTipoMovimiento =
      movimiento?.SubTipos[0]?.IdSubTipoMovimiento ?? null;
    this.lineas = [];
    this.previsualizacionFactura = null;
    this.proveedorNuevo = new ProveedorGuardar();
    this.limpiarLinea();
    this.soloLectura = false;
    this.showForm = true;
  }

  seleccionarFactura(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.item(0);
    input.value = '';
    if (!archivo || !this.catalogos || this.procesandoFactura) {
      return;
    }

    if (!EntradaCompraMantenimientoComponent.TIPOS_DOCUMENTO_IA_PERMITIDOS
      .includes(archivo.type)) {
      Swal.fire(
        'Formato no compatible',
        'Seleccione una imagen JPG, PNG, WebP o un archivo PDF.',
        'info'
      );
      return;
    }
    if (archivo.size > EntradaCompraMantenimientoComponent.MAXIMO_DOCUMENTO_IA_BYTES) {
      Swal.fire(
        'Documento demasiado grande',
        'El archivo no puede superar 8 MB.',
        'info'
      );
      return;
    }

    this.nuevo();
    // La fecha de emisión debe proceder exclusivamente del documento.
    // Durante la lectura no conservamos la fecha actual del formulario nuevo.
    this.formulario.FechaEmision = '';
    this.procesandoFactura = true;
    this.entradaCompraService.previsualizarFactura(archivo).subscribe({
      next: response => {
        this.procesandoFactura = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'No pudimos leer el documento',
            response.Message || 'Prueba con una imagen o PDF más legible.',
            'info'
          );
          return;
        }

        if (response.Data.Cuota) {
          this.cuotaFacturaIa = response.Data.Cuota;
        }
        this.aplicarPrevisualizacionFactura(response.Data);
      },
      error: error => {
        this.procesandoFactura = false;
        if (error?.error?.ErrorCode === 'AI_DOCUMENT_QUOTA_EXCEEDED') {
          this.cargarCuotaFacturaIa();
        }
        this.mostrarError(
          error,
          'No pudimos leer el documento. Prueba con una imagen o PDF más legible.'
        );
      }
    });
  }

  actualizarArticuloLinea(linea: LineaCompraEdicion): void {
    const articulo = this.catalogos?.Articulos.find(
      item => item.IdProducto === linea.IdProducto
    );
    if (!articulo) {
      linea.Producto = '';
      linea.UnidadMedida = '';
      linea.Inventariable = false;
      linea.IdSubAreaAlmacen = null;
      linea.Impuestos = [];
      linea.RequiereRevision = true;
      return;
    }

    linea.Producto = articulo.Descripcion;
    linea.UnidadMedida = articulo.UnidadMedida;
    linea.Inventariable = articulo.Inventariable;
    linea.Impuestos = [...articulo.Impuestos];
    linea.IdSubAreaAlmacen = articulo.Inventariable
      ? (this.catalogos?.SubAreas.length === 1
          ? this.catalogos.SubAreas[0].IdSubAreaAlmacen
          : linea.IdSubAreaAlmacen)
      : null;
    this.actualizarRevisionLinea(linea);
  }

  actualizarRevisionLinea(linea: LineaCompraEdicion): void {
    linea.RequiereRevision = !linea.IdProducto ||
      linea.Cantidad <= 0 ||
      linea.Importe < 0 ||
      (linea.Inventariable && !linea.IdSubAreaAlmacen);
  }

  editar(row: EntradaCompraResumen): void {
    this.abrir(row.IdEntrada, false);
  }

  ver(row: EntradaCompraResumen): void {
    this.abrir(row.IdEntrada, true);
  }

  abrir(idEntrada: number, soloLectura: boolean): void {
    this.cargando = true;
    this.entradaCompraService.obtener(idEntrada).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'Error',
            response.Message || 'No se pudo abrir la compra.',
            'error'
          );
          return;
        }
        this.cargarFormulario(response.Data);
        this.soloLectura = soloLectura || response.Data.Estado !== 1;
        this.showForm = true;
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo abrir la compra.');
      }
    });
  }

  cambiarMovimiento(): void {
    this.formulario.IdSubTipoMovimiento =
      this.subTiposMovimiento[0]?.IdSubTipoMovimiento ?? null;
  }

  seleccionarArticulo(): void {
    const articulo = this.articuloAgregar;
    if (!articulo) {
      this.importeAgregar = 0;
      this.idSubAreaAgregar = null;
      this.impuestosAgregar = [];
      return;
    }

    this.importeAgregar = Number(
      (articulo.PrecioCompra * this.cantidadAgregar).toFixed(2)
    );
    const detalleOrigen = this.notaOrigen?.Detalles.find(
      detalle => detalle.IdProducto === articulo.IdProducto
    );
    this.impuestosAgregar = detalleOrigen
      ? [...detalleOrigen.Impuestos]
      : [...articulo.Impuestos];
    if (detalleOrigen) {
      this.idSubAreaAgregar =
        detalleOrigen.IdSubAreaAlmacen;
    }
    if (!articulo.Inventariable) {
      this.idSubAreaAgregar = null;
    }
  }

  actualizarImporteSugerido(): void {
    const articulo = this.articuloAgregar;
    if (!articulo || this.cantidadAgregar <= 0) {
      return;
    }
    this.importeAgregar = Number(
      (articulo.PrecioCompra * this.cantidadAgregar).toFixed(2)
    );
  }

  agregarLinea(): void {
    const articulo = this.articuloAgregar;
    if (!articulo) {
      Swal.fire(
        'Falta el artículo',
        'Seleccione el artículo que está ingresando.',
        'info'
      );
      return;
    }
    if (this.lineas.some(l => l.IdProducto === articulo.IdProducto)) {
      Swal.fire(
        'Artículo repetido',
        'El artículo ya está incluido en el documento.',
        'info'
      );
      return;
    }
    if (this.cantidadAgregar <= 0 || this.importeAgregar < 0) {
      Swal.fire(
        'Revise la línea',
        'La cantidad debe ser mayor que cero y el importe no puede ser negativo.',
        'info'
      );
      return;
    }
    if (articulo.Inventariable && !this.idSubAreaAgregar) {
      Swal.fire(
        'Falta el destino',
        'Seleccione la subárea donde ingresará el artículo.',
        'info'
      );
      return;
    }

    this.lineas.push({
      IdProducto: articulo.IdProducto,
      Producto: articulo.Descripcion,
      UnidadMedida: articulo.UnidadMedida,
      Inventariable: articulo.Inventariable,
      Cantidad: this.cantidadAgregar,
      Importe: this.importeAgregar,
      IdSubAreaAlmacen: articulo.Inventariable
        ? this.idSubAreaAgregar
        : null,
      Impuestos: [...this.impuestosAgregar]
    });
    this.lineas = [...this.lineas];
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

    const dto: EntradaCompraGuardar = {
      ...this.formulario,
      IdProveedor: Number(this.formulario.IdProveedor),
      IdTipoMovimiento: Number(this.formulario.IdTipoMovimiento),
      IdSubTipoMovimiento: Number(
        this.formulario.IdSubTipoMovimiento
      ),
      Detalles: this.lineas.map(linea => ({
        IdProducto: Number(linea.IdProducto),
        Cantidad: Number(linea.Cantidad),
        Importe: Number(linea.Importe),
        IdSubAreaAlmacen: linea.IdSubAreaAlmacen,
        Impuestos: [...linea.Impuestos]
      }))
    };

    this.guardando = true;
    const request = this.previsualizacionFactura &&
      !this.formulario.IdProveedor &&
      !this.compra &&
      !this.notaOrigen
      ? this.entradaCompraService.confirmarFactura({
          Entrada: dto,
          NuevoProveedor: this.proveedorNuevo
        })
      : this.notaOrigen
      ? this.entradaCompraService.crearNota({
          IdEntradaOrigen: this.notaOrigen.IdEntrada,
          TipoNota: this.tipoNotaCreacion,
          TipoAjuste: this.tipoAjusteNota,
          Documento: dto
        })
      : this.compra
      ? this.entradaCompraService.actualizar(
          this.compra.IdEntrada,
          dto
        )
      : this.entradaCompraService.crear(dto);

    request.subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'No se pudo guardar',
            response.Message || 'Revise los datos del documento.',
            'error'
          );
          return;
        }

        this.cargarFormulario(response.Data);
        this.incluirProveedorCreado(response.Data);
        const eraNota = !!this.notaOrigen;
        this.notaOrigen = null;
        this.soloLectura = false;
        Swal.fire(
          eraNota ? 'Nota guardada' : 'Compra guardada',
          'El documento quedó generado. Revíselo para aplicar sus movimientos.',
          'success'
        );
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar la compra.');
      }
    });
  }

  revisar(): void {
    if (!this.compra || this.compra.Estado !== 1) {
      return;
    }

    Swal.fire({
      title: 'Revisar ingreso de compra',
      text: 'Se actualizarán las existencias, el precio de compra y el coste de las recetas afectadas.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Revisar y aplicar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !this.compra) {
        return;
      }
      this.guardando = true;
      this.entradaCompraService.revisar(this.compra.IdEntrada).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire(
              'No se pudo revisar',
              response.Message || 'Revise la información de la compra.',
              'error'
            );
            return;
          }
          this.cargarFormulario(response.Data);
          this.soloLectura = true;
          Swal.fire(
            'Compra revisada',
            'Las existencias y costes quedaron actualizados.',
            'success'
          );
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo revisar la compra.');
        }
      });
    });
  }

  anular(): void {
    if (!this.compra || ![1, 2].includes(this.compra.Estado)) {
      return;
    }

    const afectoStock = this.compra.Estado === 2;
    Swal.fire({
      title: 'Anular ingreso de compra',
      text: afectoStock
        ? 'Se revertirán las existencias y el movimiento de almacén generado por esta compra.'
        : 'El documento generado quedará anulado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-button--danger' }
    }).then(result => {
      if (!result.isConfirmed || !this.compra) {
        return;
      }
      this.guardando = true;
      this.entradaCompraService.anular(this.compra.IdEntrada).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire(
              'No se pudo anular',
              response.Message || 'No se pudo anular la compra.',
              'error'
            );
            return;
          }
          this.cargarFormulario(response.Data);
          this.soloLectura = true;
          Swal.fire('Compra anulada', '', 'success');
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo anular la compra.');
        }
      });
    });
  }

  registrarPago(): void {
    if (!this.compra || !this.pago.IdTipoPago ||
        this.pago.MontoPagado <= 0) {
      Swal.fire(
        'Faltan datos',
        'Seleccione la forma de pago e indique un importe.',
        'info'
      );
      return;
    }

    this.guardando = true;
    this.entradaCompraService.registrarPago(
      this.compra.IdEntrada,
      this.pago
    ).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'No se pudo registrar el pago',
            response.Message || 'Revise los datos indicados.',
            'error'
          );
          return;
        }
        this.cargarFormulario(response.Data);
        Swal.fire('Pago registrado', '', 'success');
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo registrar el pago.');
      }
    });
  }

  eliminarPago(pago: EntradaCompraPago): void {
    if (!this.compra) {
      return;
    }

    Swal.fire({
      title: 'Eliminar pago',
      text: 'El saldo y el estado de pago se recalcularán automáticamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-button--danger' }
    }).then(result => {
      if (!result.isConfirmed || !this.compra) {
        return;
      }
      this.guardando = true;
      this.entradaCompraService.eliminarPago(
        this.compra.IdEntrada,
        pago.IdPagoEntrada
      ).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire(
              'No se pudo eliminar',
              response.Message || 'No se pudo eliminar el pago.',
              'error'
            );
            return;
          }
          this.cargarFormulario(response.Data);
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo eliminar el pago.');
        }
      });
    });
  }

  reprogramarPago(): void {
    if (!this.compra || !this.fechaPagoProgramada) {
      return;
    }
    this.guardando = true;
    this.entradaCompraService.reprogramarPago(
      this.compra.IdEntrada,
      this.fechaPagoProgramada
    ).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'No se pudo actualizar',
            response.Message || 'Revise la fecha indicada.',
            'error'
          );
          return;
        }
        this.cargarFormulario(response.Data);
        Swal.fire('Fecha de pago actualizada', '', 'success');
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo actualizar la fecha.');
      }
    });
  }

  volver(): void {
    this.showForm = false;
    this.compra = null;
    this.notaOrigen = null;
    this.previsualizacionFactura = null;
    this.proveedorNuevo = new ProveedorGuardar();
    this.buscar();
  }

  cerrar(): void {
    if (this.showForm) {
      this.volver();
      return;
    }
    this.dialogRef.close();
  }

  descripcionSubArea(id: number | null): string {
    const subArea = this.catalogos?.SubAreas.find(
      s => s.IdSubAreaAlmacen === id
    );
    return subArea
      ? `${subArea.AreaAlmacen} · ${subArea.Descripcion}`
      : '—';
  }

  descripcionTipoDocumento(id: string): string {
    return this.catalogos?.TiposDocumento.find(
      tipo => tipo.Id === id
    )?.Descripcion ?? id;
  }

  descripcionImpuestos(ids: string[]): string {
    if (!ids.length) {
      return 'Sin impuesto';
    }
    return ids
      .map(id => this.impuesto(id)?.Descripcion || id)
      .join(', ');
  }

  baseLinea(linea: LineaCompraEdicion): number {
    const totalTasa = linea.Impuestos.reduce(
      (total, id) => total + this.tasaNormalizada(this.impuesto(id)),
      0
    );
    const fijo = linea.Impuestos.reduce(
      (total, id) =>
        total +
        (this.impuesto(id)?.FijoPorUnidad || 0) * linea.Cantidad,
      0
    );
    const base = this.formulario.PreciosIncluyenImpuestos
      ? (linea.Importe - fijo) / (1 + totalTasa)
      : linea.Importe;
    return Math.max(0, this.redondear(base));
  }

  precioLinea(linea: LineaCompraEdicion): number {
    if (linea.Cantidad <= 0) {
      return 0;
    }
    return Math.round(
      (this.baseLinea(linea) / linea.Cantidad + Number.EPSILON) * 10000
    ) / 10000;
  }

  cambiarTratamientoImportes(incluyenImpuestos: boolean): void {
    if (this.formulario.PreciosIncluyenImpuestos === incluyenImpuestos) {
      return;
    }

    // El importe digitado no se convierte al cambiar de modalidad.
    // Igual que en la versión Windows, el mismo número pasa a
    // interpretarse como base imponible o como total con impuestos.
    this.formulario.PreciosIncluyenImpuestos = incluyenImpuestos;
    this.lineas = [...this.lineas];
  }

  impuestosLinea(linea: LineaCompraEdicion): number {
    const base = this.baseLinea(linea);
    return this.redondear(
      linea.Impuestos.reduce((total, id) => {
        const impuesto = this.impuesto(id);
        return total +
          base * this.tasaNormalizada(impuesto) +
          (impuesto?.FijoPorUnidad || 0) * linea.Cantidad;
      }, 0)
    );
  }

  totalLinea(linea: LineaCompraEdicion): number {
    return this.redondear(
      this.baseLinea(linea) + this.impuestosLinea(linea)
    );
  }

  get subtotalDocumento(): number {
    return this.redondear(
      this.lineas.reduce(
        (total, linea) => total + this.baseLinea(linea),
        0
      )
    );
  }

  get impuestosDocumento(): number {
    return this.redondear(
      this.lineas.reduce(
        (total, linea) => total + this.impuestosLinea(linea),
        0
      )
    );
  }

  get totalDocumento(): number {
    return this.redondear(
      this.subtotalDocumento + this.impuestosDocumento
    );
  }

  get totalPagado(): number {
    return this.redondear(
      (this.compra?.Pagos || []).reduce(
        (total, pago) => total + pago.MontoPagado,
        0
      )
    );
  }

  get saldoPendiente(): number {
    return this.redondear(
      Math.max(0, (this.compra?.TotalCompra || 0) - this.totalPagado)
    );
  }

  get articuloAgregar(): EntradaCompraArticulo | undefined {
    return this.catalogos?.Articulos.find(
      a => a.IdProducto === this.idArticuloAgregar
    );
  }

  get articulosParaAgregar(): EntradaCompraArticulo[] {
    const articulos = this.catalogos?.Articulos || [];
    if (!this.notaOrigen) {
      return articulos;
    }
    const permitidos = new Set(
      this.notaOrigen.Detalles.map(d => d.IdProducto)
    );
    return articulos.filter(a => permitidos.has(a.IdProducto));
  }

  get tiposDocumentoDisponibles() {
    const tipos = this.catalogos?.TiposDocumento || [];
    if (!this.notaOrigen) {
      return tipos.filter(tipo =>
        [1, 2, 3].includes(tipo.Naturaleza)
      );
    }

    return tipos.filter(tipo =>
      tipo.Naturaleza ===
        (this.tipoNotaCreacion === 1 ? 4 : 5) ||
      tipo.Naturaleza === 6
    );
  }

  get puedeCrearNota(): boolean {
    if (!this.compra ||
        this.compra.Estado !== 2 ||
        this.compra.Pagos.length > 0) {
      return false;
    }
    return this.naturalezaDocumento(
      this.compra.IdTipoDocumento
    ) === 1;
  }

  get subTiposMovimiento(): EntradaCompraSubMovimiento[] {
    return this.catalogos?.TiposMovimiento.find(
      m => m.IdTipoMovimiento === this.formulario.IdTipoMovimiento
    )?.SubTipos || [];
  }

  get monedaEsPredeterminada(): boolean {
    return this.formulario.IdMoneda ===
      this.catalogos?.IdMonedaPredeterminada;
  }

  private cargarFormulario(compra: EntradaCompra): void {
    this.previsualizacionFactura = null;
    this.compra = compra;
    this.fechaPagoProgramada = compra.FechaPagoProgramada
      ? new Date(compra.FechaPagoProgramada)
      : null;
    this.formulario = {
      IdTipoDocumento: compra.IdTipoDocumento,
      NumDocumento: compra.NumDocumento,
      FechaEmision: new Date(compra.FechaEmision),
      FechaRecepcion: new Date(compra.FechaRecepcion),
      IdProveedor: compra.IdProveedor,
      IdTipoMovimiento: compra.IdTipoMovimiento,
      IdSubTipoMovimiento: compra.IdSubTipoMovimiento,
      IdMoneda: compra.IdMoneda,
      TasaCambio: compra.TasaCambio,
      Observacion: compra.Observacion,
      PreciosIncluyenImpuestos: compra.PreciosIncluyenImpuestos,
      Detalles: []
    };
    this.lineas = compra.Detalles.map(detalle => {
      const articulo = this.catalogos?.Articulos.find(
        a => a.IdProducto === detalle.IdProducto
      );
      return {
        IdProducto: detalle.IdProducto,
        Producto: detalle.Producto,
        UnidadMedida: detalle.UnidadMedida,
        Inventariable:
          articulo?.Inventariable ??
          detalle.IdSubAreaAlmacen !== null,
        Cantidad: detalle.Cantidad,
        Importe: compra.PreciosIncluyenImpuestos
          ? detalle.Subtotal
          : detalle.ValorCompra,
        IdSubAreaAlmacen: detalle.IdSubAreaAlmacen,
        Impuestos: [...detalle.Impuestos]
      };
    });
    this.pago = this.pagoInicial();
    this.pago.IdMoneda = compra.IdMoneda;
    this.pago.MontoPagado = this.saldoPendiente;
    this.pago.IdTipoPago =
      this.catalogos?.FormasPago[0]?.Id ?? null;
    this.limpiarLinea();
  }

  puedeCanjear(row: EntradaCompraResumen): boolean {
    return row.Estado === 2 &&
      this.naturalezaDocumento(row.IdTipoDocumento) === 3 &&
      (row.EstadoPago === 0 || row.EstadoPago === 1);
  }

  guiaSeleccionada(row: EntradaCompraResumen): boolean {
    return this.idsGuiasSeleccionadas.has(row.IdEntrada);
  }

  seleccionarGuia(
    row: EntradaCompraResumen,
    seleccionada: boolean
  ): void {
    if (!this.puedeCanjear(row)) {
      return;
    }
    if (seleccionada) {
      this.idsGuiasSeleccionadas.add(row.IdEntrada);
    } else {
      this.idsGuiasSeleccionadas.delete(row.IdEntrada);
    }
  }

  async canjearGuias(): Promise<void> {
    if (!this.catalogos || this.idsGuiasSeleccionadas.size === 0) {
      Swal.fire(
        `Seleccione ${this.documentoLogisticoPlural}`,
        'Marque uno o más documentos revisados del mismo proveedor.',
        'info'
      );
      return;
    }

    const hoy = this.fechaInput(new Date());
    const tipos = this.catalogos.TiposDocumento
      .filter(t => t.Naturaleza === 1)
      .map(t => `<option value="${t.Id}">${t.Descripcion}</option>`)
      .join('');
    const monedas = this.catalogos.Monedas
      .map(m =>
        `<option value="${m.Id}" ${
          m.Id === this.catalogos?.IdMonedaPredeterminada
            ? 'selected'
            : ''
        }>${m.Descripcion}</option>`)
      .join('');
    const result = await Swal.fire({
      title: `Canjear ${this.documentoLogisticoPlural} por factura`,
      html: `
        <div class="swal-form-grid">
          <select id="canje-tipo" class="swal2-input">${tipos}</select>
          <input id="canje-numero" class="swal2-input" placeholder="Número de factura">
          <input id="canje-emision" class="swal2-input" type="date" value="${hoy}">
          <input id="canje-recepcion" class="swal2-input" type="date" value="${hoy}">
          <select id="canje-moneda" class="swal2-input">${monedas}</select>
          <input id="canje-cambio" class="swal2-input" type="number" min="0.0001" step="0.0001" value="1" placeholder="Tipo de cambio">
          <input id="canje-observacion" class="swal2-input" placeholder="Observación">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Crear factura',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const value = (id: string) =>
          (document.getElementById(id) as HTMLInputElement)?.value;
        if (!value('canje-numero')) {
          Swal.showValidationMessage(
            'Ingrese el número de la factura.'
          );
          return false;
        }
        return {
          IdTipoDocumento: value('canje-tipo'),
          NumDocumento: value('canje-numero'),
          FechaEmision: value('canje-emision'),
          FechaRecepcion: value('canje-recepcion'),
          IdMoneda: value('canje-moneda'),
          TasaCambio: Number(value('canje-cambio')),
          Observacion: value('canje-observacion')
        };
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }

    this.guardando = true;
    this.entradaCompraService.canjearGuias({
      IdsGuias: [...this.idsGuiasSeleccionadas],
      ...result.value
    }).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire(
            'No se pudo realizar el canje',
            response.Message || 'Revise los documentos seleccionados.',
            'error'
          );
          return;
        }
        this.idsGuiasSeleccionadas.clear();
        this.cargarFormulario(response.Data);
        this.soloLectura = true;
        this.showForm = true;
        Swal.fire(
          'Canje realizado',
          this.mensajeCanjeExitoso,
          'success'
        );
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo realizar el canje.');
      }
    });
  }

  iniciarNota(tipo: 1 | 2): void {
    if (!this.compra || this.compra.Estado !== 2 ||
        this.compra.Pagos.length > 0) {
      Swal.fire(
        'Acción no disponible',
        'La compra debe estar revisada y no tener pagos.',
        'info'
      );
      return;
    }

    const origen = this.compra;
    this.notaOrigen = origen;
    this.compra = null;
    this.tipoNotaCreacion = tipo;
    this.tipoAjusteNota = 1;
    this.formulario = this.formularioInicial();
    this.formulario.IdProveedor = origen.IdProveedor;
    this.formulario.IdMoneda = origen.IdMoneda;
    this.formulario.TasaCambio = origen.TasaCambio;
    this.formulario.IdTipoMovimiento = origen.IdTipoMovimiento;
    this.formulario.IdSubTipoMovimiento =
      origen.IdSubTipoMovimiento;
    this.formulario.PreciosIncluyenImpuestos =
      origen.PreciosIncluyenImpuestos;
    this.formulario.IdTipoDocumento =
      this.tiposDocumentoDisponibles[0]?.Id || '';
    this.formulario.Observacion =
      `${tipo === 1 ? 'NOTA DE CRÉDITO' : 'NOTA DE DÉBITO'} DE ` +
      `${origen.TipoDocumento} ${origen.NumDocumento}`;
    this.lineas = [];
    this.soloLectura = false;
    this.limpiarLinea();
  }

  private formularioValido(): boolean {
    const proveedorValido = !!this.formulario.IdProveedor ||
      (!!this.previsualizacionFactura &&
       !!this.proveedorNuevo.IdTipoIdentidad &&
       !!this.proveedorNuevo.NumeroIdentificacion.trim() &&
       !!this.proveedorNuevo.RazonSocial.trim() &&
       !!this.proveedorNuevo.Direccion.trim());
    if (!this.formulario.IdTipoDocumento ||
        !this.formulario.NumDocumento.trim() ||
        !proveedorValido ||
        !this.formulario.IdTipoMovimiento ||
        !this.formulario.IdSubTipoMovimiento ||
        !this.formulario.IdMoneda) {
      Swal.fire(
        'Faltan datos',
        'Complete el proveedor, documento, movimiento y moneda.',
        'info'
      );
      return false;
    }
    if (!this.formulario.FechaEmision ||
        !this.formulario.FechaRecepcion) {
      Swal.fire(
        'Faltan fechas',
        'Indique las fechas de emisión y recepción.',
        'info'
      );
      return false;
    }
    if (!this.monedaEsPredeterminada &&
        this.formulario.TasaCambio <= 0) {
      Swal.fire(
        'Falta el tipo de cambio',
        'Indique un tipo de cambio mayor que cero.',
        'info'
      );
      return false;
    }
    if (!this.lineas.length) {
      Swal.fire(
        'Documento sin artículos',
        'Agregue al menos un artículo al ingreso.',
        'info'
      );
      return false;
    }
    const lineaPendiente = this.lineas.find(linea =>
      !linea.IdProducto ||
      linea.Cantidad <= 0 ||
      linea.Importe < 0 ||
      (linea.Inventariable && !linea.IdSubAreaAlmacen)
    );
    if (lineaPendiente) {
      Swal.fire(
        'Revise los artículos leídos',
        'Seleccione el artículo, la cantidad y la subárea de las líneas señaladas antes de guardar.',
        'info'
      );
      return false;
    }
    const repetido = this.lineas.find((linea, index) =>
      this.lineas.some((otra, otroIndex) =>
        otroIndex !== index && otra.IdProducto === linea.IdProducto
      )
    );
    if (repetido) {
      Swal.fire(
        'Artículo repetido',
        'Unifique las cantidades de las líneas que corresponden al mismo artículo.',
        'info'
      );
      return false;
    }
    return true;
  }

  get documentoLogisticoPlural(): string {
    return this.catalogos?.PaisISO2?.toUpperCase() === 'ES'
      ? 'albaranes'
      : 'guías';
  }

  get mensajeCanjeExitoso(): string {
    return this.catalogos?.PaisISO2?.toUpperCase() === 'ES'
      ? 'La factura quedó vinculada y los albaranes fueron marcados como canjeados.'
      : 'La factura quedó vinculada y las guías fueron marcadas como canjeadas.';
  }

  private cargarLicenciaFacturaIa(): void {
    this.licenciaTenantService.obtener().subscribe({
      next: response => {
        const licencia = response.Data;
        this.facturaIaHabilitada = licencia == null ||
          licencia.Caracteristicas?.some(caracteristica =>
            caracteristica.Codigo === 'almacen.captura_documentos_ia' &&
            caracteristica.Habilitada
          ) === true;
        if (this.facturaIaHabilitada) {
          this.cargarCuotaFacturaIa();
        }
      },
      error: () => {
        this.facturaIaHabilitada = false;
        this.cuotaFacturaIa = null;
      }
    });
  }

  private cargarCuotaFacturaIa(): void {
    this.entradaCompraService.cuotaDocumentosIa().subscribe({
      next: response => {
        this.cuotaFacturaIa = response.Success ? response.Data : null;
      },
      error: () => this.cuotaFacturaIa = null
    });
  }

  private aplicarPrevisualizacionFactura(
    datos: FacturaCompraIaPrevisualizacion
  ): void {
    this.previsualizacionFactura = datos;
    this.formulario.IdProveedor = datos.IdProveedor;
    this.proveedorNuevo = new ProveedorGuardar({
      IdTipoIdentidad: datos.IdTipoIdentidadProveedor || '',
      NumeroIdentificacion: datos.NumeroIdentificacionProveedor || '',
      RazonSocial: datos.RazonSocialProveedor || '',
      Direccion: datos.DireccionProveedor || '',
      IdDistrito: 0,
      Telefono: datos.TelefonoProveedor || null,
      Contacto: datos.ContactoProveedor || null,
      Email: datos.EmailProveedor || null,
      DiasCredito: 0,
      Activo: true
    });
    if (datos.IdTipoDocumento) {
      this.formulario.IdTipoDocumento = datos.IdTipoDocumento;
    }
    this.formulario.NumDocumento = datos.NumeroDocumento || '';
    if (datos.FechaEmision) {
      this.formulario.FechaEmision =
        this.fechaLocal(datos.FechaEmision) || '';
    } else {
      this.formulario.FechaEmision = '';
    }
    if (datos.IdMoneda) {
      this.formulario.IdMoneda = datos.IdMoneda;
    }
    if (datos.TasaCambio && datos.TasaCambio > 0) {
      this.formulario.TasaCambio = datos.TasaCambio;
    }
    this.formulario.PreciosIncluyenImpuestos =
      datos.PreciosIncluyenImpuestos;
    this.lineas = datos.Lineas.map(linea => ({
      IdProducto: linea.IdProducto,
      Producto: linea.Producto,
      UnidadMedida: linea.UnidadMedida,
      Inventariable: linea.Inventariable,
      Cantidad: linea.Cantidad,
      Importe: linea.Importe,
      IdSubAreaAlmacen: linea.IdSubAreaAlmacen,
      Impuestos: [...linea.Impuestos],
      OrigenIa: true,
      CodigoOriginal: linea.CodigoOriginal,
      DescripcionOriginal: linea.DescripcionOriginal,
      UnidadMedidaOriginal: linea.UnidadMedidaOriginal,
      CantidadOriginal: linea.CantidadOriginal,
      FactorConversionUnidad: linea.FactorConversionUnidad,
      ConfianzaIa: linea.Confianza,
      RequiereRevision: linea.RequiereRevision,
      MotivoRevision: linea.MotivoRevision
    }));
  }

  private fechaLocal(valor: Date | string): Date | null {
    const fechaUtc = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(fechaUtc.getTime())) {
      return null;
    }

    return new Date(
      fechaUtc.getUTCFullYear(),
      fechaUtc.getUTCMonth(),
      fechaUtc.getUTCDate()
    );
  }

  private incluirProveedorCreado(compra: EntradaCompra): void {
    if (!this.catalogos ||
        this.catalogos.Proveedores.some(
          proveedor => proveedor.IdProveedor === compra.IdProveedor
        )) {
      return;
    }

    this.catalogos.Proveedores = [
      ...this.catalogos.Proveedores,
      {
        IdProveedor: compra.IdProveedor,
        NumeroIdentificacion: compra.NumeroIdentificacionProveedor,
        RazonSocial: compra.Proveedor,
        DiasCredito: this.proveedorNuevo.DiasCredito
      }
    ];
  }

  private limpiarLinea(): void {
    this.idArticuloAgregar = null;
    this.cantidadAgregar = 1;
    this.importeAgregar = 0;
    this.idSubAreaAgregar = null;
    this.impuestosAgregar = [];
  }

  private formularioInicial(): EntradaCompraGuardar {
    const hoy = new Date();
    return {
      IdTipoDocumento: '',
      NumDocumento: '',
      FechaEmision: hoy,
      FechaRecepcion: hoy,
      IdProveedor: null,
      IdTipoMovimiento: null,
      IdSubTipoMovimiento: null,
      IdMoneda: '',
      TasaCambio: 1,
      Observacion: '',
      PreciosIncluyenImpuestos: false,
      Detalles: []
    };
  }

  private pagoInicial(): EntradaCompraPagoGuardar {
    return {
      FechaPago: new Date(),
      IdTipoPago: null,
      IdMoneda: this.compra?.IdMoneda || '',
      IdBancoOrigen: null,
      IdBancoDestino: null,
      MontoPagado: 0,
      Referencia: '',
      Observacion: ''
    };
  }

  private inicioMes(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  private impuesto(id: string): EntradaCompraImpuesto | undefined {
    return this.catalogos?.Impuestos.find(
      impuesto => impuesto.IdImpuestoPais === id
    );
  }

  private naturalezaDocumento(id: string): number | null {
    return this.catalogos?.TiposDocumento.find(
      tipo => tipo.Id === id
    )?.Naturaleza ?? null;
  }

  private tasaNormalizada(
    impuesto: EntradaCompraImpuesto | undefined
  ): number {
    if (!impuesto) {
      return 0;
    }
    return impuesto.Tasa > 1
      ? impuesto.Tasa / 100
      : impuesto.Tasa;
  }

  private redondear(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private fechaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const day = `${fecha.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire(
      'Error',
      error?.error?.Message ||
        error?.error?.message ||
        error?.message ||
        fallback,
      'error'
    );
  }
}
