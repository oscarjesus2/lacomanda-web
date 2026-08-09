import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  ConfiguracionPorcionamiento,
  ConfiguracionPorcionamientoDetalle,
  ConfiguracionPorcionamientoGuardar,
  Porcionamiento,
  PorcionamientoArticulo,
  PorcionamientoCatalogos,
  PorcionamientoGuardar,
  PorcionamientoResumen
} from 'src/app/models/porcionamiento.models';
import { PorcionamientoService } from 'src/app/services/porcionamiento.service';

interface LineaPorcionamiento {
  IdProducto: number;
  Producto: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  CantidadOrigen: number;
  CantidadProducida: number;
  FactorIdeal: number;
  PrecioUnitario?: number;
}

type VistaPorcionamiento = 'lista' | 'operacion' | 'configuracion';

@Component({
  selector: 'app-porcionamiento-mantenimiento',
  templateUrl: './porcionamiento-mantenimiento.component.html'
})
export class PorcionamientoMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'numero', 'fecha', 'subarea', 'origen', 'bruta', 'util', 'merma', 'estado', 'acciones'
  ];
  dataSource = new MatTableDataSource<PorcionamientoResumen>([]);
  catalogos: PorcionamientoCatalogos | null = null;
  porcionamiento: Porcionamiento | null = null;
  vista: VistaPorcionamiento = 'lista';
  filtro = {
    FechaInicio: this.inicioMes(),
    FechaFin: new Date(),
    IdSubAreaAlmacen: null as number | null,
    Estado: null as number | null,
    Buscar: ''
  };

  formulario = this.formularioInicial();
  lineas: LineaPorcionamiento[] = [];
  idProductoAgregar: number | null = null;

  configuracion: ConfiguracionPorcionamientoGuardar = this.configuracionInicial();
  configuracionOriginal: ConfiguracionPorcionamiento | null = null;
  configuracionLineas: ConfiguracionPorcionamientoDetalle[] = [];
  idProductoConfiguradoAgregar: number | null = null;

  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<PorcionamientoMantenimientoComponent>,
    private readonly service: PorcionamientoService
  ) {}

  ngOnInit(): void {
    this.cargarInicial();
  }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({
      catalogos: this.service.catalogos(),
      porcionamientos: this.service.listar(this.filtro)
    }).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.catalogos.Success || !response.porcionamientos.Success) {
          Swal.fire(
            'No se pudo iniciar',
            response.catalogos.Message || response.porcionamientos.Message,
            'error'
          );
          return;
        }
        this.catalogos = response.catalogos.Data;
        this.dataSource.data = response.porcionamientos.Data || [];
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo cargar el mantenimiento de porcionamiento.');
      }
    });
  }

  buscar(): void {
    this.cargando = true;
    this.service.listar(this.filtro).subscribe({
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
    if (!this.catalogos?.Configuraciones?.length) {
      Swal.fire({
        title: 'Configure primero el porcionamiento',
        text: 'Indique qué artículo se transforma y qué productos se obtienen.',
        icon: 'info',
        confirmButtonText: 'Configurar ahora'
      }).then(() => this.abrirConfiguracion());
      return;
    }
    this.porcionamiento = null;
    this.formulario = this.formularioInicial();
    this.formulario.IdSubAreaAlmacen = this.catalogos.SubAreas[0]?.Id || 0;
    this.formulario.IdProductoOrigen = this.origenesDisponibles[0]?.IdProducto || 0;
    this.lineas = [];
    this.idProductoAgregar = null;
    this.vista = 'operacion';
  }

  abrir(row: PorcionamientoResumen): void {
    this.cargando = true;
    this.service.obtener(row.IdPorcionamiento).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('Error', response.Message || 'No se pudo abrir el porcionamiento.', 'error');
          return;
        }
        this.cargarOperacion(response.Data);
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error, 'No se pudo abrir el porcionamiento.');
      }
    });
  }

  cambiarOrigen(): void {
    this.lineas = [];
    this.idProductoAgregar = null;
  }

  agregarProducto(): void {
    const configurado = this.productosConfiguradosDisponibles.find(
      item => item.IdProducto === Number(this.idProductoAgregar)
    );
    if (!configurado) {
      Swal.fire('Seleccione un producto', 'Elija el producto obtenido.', 'info');
      return;
    }
    this.lineas = [...this.lineas, {
      IdProducto: configurado.IdProducto,
      Producto: configurado.Producto,
      IdUnidadMedida: configurado.IdUnidadMedida,
      UnidadMedida: configurado.UnidadMedida,
      CantidadOrigen: configurado.FactorIdeal > 0 ? configurado.FactorIdeal : 1,
      CantidadProducida: 1,
      FactorIdeal: configurado.FactorIdeal
    }];
    this.idProductoAgregar = null;
  }

  quitarProducto(index: number): void {
    this.lineas.splice(index, 1);
    this.lineas = [...this.lineas];
  }

  crear(): void {
    if (!this.operacionValida()) {
      return;
    }
    const dto: PorcionamientoGuardar = {
      Fecha: this.formulario.Fecha,
      IdSubAreaAlmacen: Number(this.formulario.IdSubAreaAlmacen),
      IdProductoOrigen: Number(this.formulario.IdProductoOrigen),
      CantidadBruta: Number(this.formulario.CantidadBruta),
      Detalles: this.lineas.map(linea => ({
        IdProducto: linea.IdProducto,
        CantidadOrigen: Number(linea.CantidadOrigen),
        CantidadProducida: Number(linea.CantidadProducida)
      }))
    };
    this.guardando = true;
    this.service.crear(dto).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('No se pudo porcionar', response.Message || 'Revise los datos.', 'error');
          return;
        }
        this.cargarOperacion(response.Data);
        this.recargarCatalogos();
        Swal.fire(
          'Porcionamiento registrado',
          'Los stocks, costos de compra y movimientos de Kardex fueron actualizados.',
          'success'
        );
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo registrar el porcionamiento.');
      }
    });
  }

  anular(): void {
    if (!this.porcionamiento || this.porcionamiento.Estado !== 1) {
      return;
    }
    Swal.fire({
      title: 'Anular porcionamiento',
      text: 'Se repondrá el artículo origen, se descontarán los productos obtenidos y se anulará el Kardex.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular porcionamiento',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed || !this.porcionamiento) {
        return;
      }
      this.guardando = true;
      this.service.anular(this.porcionamiento.IdPorcionamiento).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire('No se pudo anular', response.Message || 'Revise la operación.', 'error');
            return;
          }
          this.cargarOperacion(response.Data);
          this.recargarCatalogos();
          Swal.fire('Porcionamiento anulado', 'Stocks y Kardex fueron revertidos.', 'success');
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo anular el porcionamiento.');
        }
      });
    });
  }

  abrirConfiguracion(config?: ConfiguracionPorcionamiento): void {
    this.configuracionOriginal = config || null;
    const idOrigen = config?.IdProductoOrigen || this.catalogos?.ArticulosPorcionables[0]?.IdProducto || 0;
    this.configuracion = {
      IdProductoOrigen: idOrigen,
      ControlaMerma: config?.ControlaMerma || false,
      PorcentajeMermaReferencial: config?.PorcentajeMermaReferencial || 0,
      Detalles: []
    };
    this.configuracionLineas = (config?.Detalles || []).map(item => ({ ...item }));
    this.idProductoConfiguradoAgregar = null;
    this.vista = 'configuracion';
  }

  cambiarOrigenConfiguracion(): void {
    const existente = this.catalogos?.Configuraciones.find(
      item => item.IdProductoOrigen === Number(this.configuracion.IdProductoOrigen)
    );
    this.configuracionOriginal = existente || null;
    this.configuracion.ControlaMerma = existente?.ControlaMerma || false;
    this.configuracion.PorcentajeMermaReferencial = existente?.PorcentajeMermaReferencial || 0;
    this.configuracionLineas = (existente?.Detalles || []).map(item => ({ ...item }));
    this.idProductoConfiguradoAgregar = null;
  }

  agregarProductoConfigurado(): void {
    const articulo = this.productosPorcionadosDisponibles.find(
      item => item.IdProducto === Number(this.idProductoConfiguradoAgregar)
    );
    if (!articulo) {
      Swal.fire('Seleccione un producto', 'Elija un producto porcionado.', 'info');
      return;
    }
    this.configuracionLineas = [...this.configuracionLineas, {
      IdProducto: articulo.IdProducto,
      Producto: articulo.Descripcion,
      IdUnidadMedida: articulo.IdUnidadMedida,
      UnidadMedida: articulo.UnidadMedida,
      FactorIdeal: 1,
      FactorMaximo: 0
    }];
    this.idProductoConfiguradoAgregar = null;
  }

  quitarProductoConfigurado(index: number): void {
    this.configuracionLineas.splice(index, 1);
    this.configuracionLineas = [...this.configuracionLineas];
  }

  guardarConfiguracion(): void {
    if (!this.configuracion.IdProductoOrigen || !this.configuracionLineas.length ||
        this.configuracionLineas.some(item => Number(item.FactorIdeal) <= 0 || Number(item.FactorMaximo) < 0)) {
      Swal.fire(
        'Complete la configuración',
        'Seleccione el artículo origen y agregue al menos un producto con un factor ideal mayor que cero.',
        'info'
      );
      return;
    }
    const dto: ConfiguracionPorcionamientoGuardar = {
      IdProductoOrigen: Number(this.configuracion.IdProductoOrigen),
      ControlaMerma: this.configuracion.ControlaMerma,
      PorcentajeMermaReferencial: this.configuracion.ControlaMerma
        ? Number(this.configuracion.PorcentajeMermaReferencial)
        : 0,
      Detalles: this.configuracionLineas.map(item => ({
        IdProducto: item.IdProducto,
        FactorIdeal: Number(item.FactorIdeal),
        FactorMaximo: Number(item.FactorMaximo)
      }))
    };
    this.guardando = true;
    this.service.guardarConfiguracion(dto).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success) {
          Swal.fire('No se pudo guardar', response.Message || 'Revise los datos.', 'error');
          return;
        }
        Swal.fire('Configuración guardada', 'Ya puede registrar porcionamientos con esta relación.', 'success');
        this.recargarCatalogos(true);
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error, 'No se pudo guardar la configuración.');
      }
    });
  }

  eliminarConfiguracion(config: ConfiguracionPorcionamiento): void {
    Swal.fire({
      title: 'Eliminar configuración',
      text: `Se quitará la relación de porcionamiento de ${config.ProductoOrigen}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.guardando = true;
      this.service.eliminarConfiguracion(config.IdProductoOrigen).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success) {
            Swal.fire('No se pudo eliminar', response.Message, 'error');
            return;
          }
          Swal.fire('Configuración eliminada', response.Message, 'success');
          this.recargarCatalogos(true);
        },
        error: error => {
          this.guardando = false;
          this.mostrarError(error, 'No se pudo eliminar la configuración.');
        }
      });
    });
  }

  volver(): void {
    this.vista = 'lista';
    this.porcionamiento = null;
    this.buscar();
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  get origenesDisponibles(): PorcionamientoArticulo[] {
    const configurados = new Set((this.catalogos?.Configuraciones || []).map(item => item.IdProductoOrigen));
    return (this.catalogos?.ArticulosPorcionables || []).filter(item => configurados.has(item.IdProducto));
  }

  get configuracionOrigen(): ConfiguracionPorcionamiento | undefined {
    return this.catalogos?.Configuraciones.find(
      item => item.IdProductoOrigen === Number(this.formulario.IdProductoOrigen)
    );
  }

  get articuloOrigen(): PorcionamientoArticulo | undefined {
    return this.catalogos?.ArticulosPorcionables.find(
      item => item.IdProducto === Number(this.formulario.IdProductoOrigen)
    );
  }

  get stockOrigen(): number {
    return Number(this.catalogos?.Stocks.find(item =>
      item.IdSubAreaAlmacen === Number(this.formulario.IdSubAreaAlmacen) &&
      item.IdProducto === Number(this.formulario.IdProductoOrigen)
    )?.Stock || 0);
  }

  get productosConfiguradosDisponibles(): ConfiguracionPorcionamientoDetalle[] {
    const agregados = new Set(this.lineas.map(item => item.IdProducto));
    return (this.configuracionOrigen?.Detalles || []).filter(item => !agregados.has(item.IdProducto));
  }

  get productosPorcionadosDisponibles(): PorcionamientoArticulo[] {
    const agregados = new Set(this.configuracionLineas.map(item => item.IdProducto));
    return (this.catalogos?.ArticulosPorcionados || []).filter(item =>
      item.IdProducto !== Number(this.configuracion.IdProductoOrigen) && !agregados.has(item.IdProducto)
    );
  }

  get cantidadUtil(): number {
    return this.lineas.reduce((total, item) => total + Number(item.CantidadOrigen || 0), 0);
  }

  get merma(): number {
    return Math.max(0, Number(this.formulario.CantidadBruta || 0) - this.cantidadUtil);
  }

  get porcentajeMerma(): number {
    const bruta = Number(this.formulario.CantidadBruta || 0);
    return bruta > 0 ? this.merma * 100 / bruta : 0;
  }

  get costoTotal(): number {
    return Number(this.formulario.CantidadBruta || 0) * Number(this.articuloOrigen?.PrecioCompra || 0);
  }

  factor(linea: LineaPorcionamiento): number {
    const producida = Number(linea.CantidadProducida || 0);
    return producida > 0 ? Number(linea.CantidadOrigen || 0) / producida : 0;
  }

  costoPorcion(linea: LineaPorcionamiento): number {
    return this.cantidadUtil > 0 ? this.factor(linea) * this.costoTotal / this.cantidadUtil : 0;
  }

  private operacionValida(): boolean {
    const bruta = Number(this.formulario.CantidadBruta);
    if (!this.formulario.IdSubAreaAlmacen || !this.formulario.IdProductoOrigen || !this.formulario.Fecha ||
        !Number.isFinite(bruta) || bruta <= 0 || !this.lineas.length) {
      Swal.fire(
        'Complete el porcionamiento',
        'Seleccione subárea, artículo origen y fecha; indique la cantidad bruta y agregue productos obtenidos.',
        'info'
      );
      return false;
    }
    if (bruta > this.stockOrigen) {
      Swal.fire('Stock insuficiente', `Solo hay ${this.numero(this.stockOrigen)} ${this.articuloOrigen?.UnidadMedida || ''}.`, 'info');
      return false;
    }
    if (this.lineas.some(item => Number(item.CantidadOrigen) <= 0 || Number(item.CantidadProducida) <= 0)) {
      Swal.fire('Cantidades incorrectas', 'Todas las cantidades deben ser mayores que cero.', 'info');
      return false;
    }
    if (this.cantidadUtil > bruta) {
      Swal.fire('Cantidad útil incorrecta', 'La cantidad usada por los productos no puede superar la cantidad bruta.', 'info');
      return false;
    }
    return true;
  }

  private cargarOperacion(item: Porcionamiento): void {
    this.porcionamiento = item;
    this.formulario = {
      Fecha: new Date(item.Fecha),
      IdSubAreaAlmacen: item.IdSubAreaAlmacen,
      IdProductoOrigen: item.IdProductoOrigen,
      CantidadBruta: item.CantidadBruta,
      Detalles: []
    };
    this.lineas = item.Detalles.map(detalle => ({
      IdProducto: detalle.IdProducto,
      Producto: detalle.Producto,
      IdUnidadMedida: detalle.IdUnidadMedida,
      UnidadMedida: detalle.UnidadMedida,
      CantidadOrigen: detalle.CantidadOrigen,
      CantidadProducida: detalle.CantidadProducida,
      FactorIdeal: detalle.Factor,
      PrecioUnitario: detalle.PrecioUnitario
    }));
    this.vista = 'operacion';
  }

  private recargarCatalogos(volverALista = false): void {
    this.service.catalogos().subscribe({
      next: response => {
        if (response.Success && response.Data) {
          this.catalogos = response.Data;
          if (volverALista) {
            this.volver();
          }
        }
      }
    });
  }

  private formularioInicial(): PorcionamientoGuardar {
    return { Fecha: new Date(), IdSubAreaAlmacen: 0, IdProductoOrigen: 0, CantidadBruta: 0, Detalles: [] };
  }

  private configuracionInicial(): ConfiguracionPorcionamientoGuardar {
    return { IdProductoOrigen: 0, ControlaMerma: false, PorcentajeMermaReferencial: 0, Detalles: [] };
  }

  private inicioMes(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  numero(valor: number): string {
    return Number(valor || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  private mostrarError(error: any, fallback: string): void {
    Swal.fire('Error', error?.error?.Message || error?.error?.message || fallback, 'error');
  }
}
