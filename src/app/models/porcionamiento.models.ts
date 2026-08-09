export interface PorcionamientoResumen {
  IdPorcionamiento: number;
  Fecha: string;
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
  AreaAlmacen: string;
  IdProductoOrigen: number;
  ProductoOrigen: string;
  UnidadOrigen: string;
  CantidadBruta: number;
  CantidadUtil: number;
  Merma: number;
  CostoTotal: number;
  Estado: number;
  EstadoDescripcion: string;
  CantidadProductos: number;
}

export interface Porcionamiento extends PorcionamientoResumen {
  PrecioOrigen: number;
  Detalles: PorcionamientoDetalle[];
}

export interface PorcionamientoDetalle {
  IdProducto: number;
  Producto: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  CantidadOrigen: number;
  CantidadProducida: number;
  Factor: number;
  PrecioUnitario: number;
}

export interface PorcionamientoGuardar {
  Fecha: Date | string;
  IdSubAreaAlmacen: number;
  IdProductoOrigen: number;
  CantidadBruta: number;
  Detalles: PorcionamientoDetalleGuardar[];
}

export interface PorcionamientoDetalleGuardar {
  IdProducto: number;
  CantidadOrigen: number;
  CantidadProducida: number;
}

export interface ConfiguracionPorcionamientoGuardar {
  IdProductoOrigen: number;
  ControlaMerma: boolean;
  PorcentajeMermaReferencial: number;
  Detalles: ConfiguracionPorcionamientoDetalleGuardar[];
}

export interface ConfiguracionPorcionamientoDetalleGuardar {
  IdProducto: number;
  FactorIdeal: number;
  FactorMaximo: number;
}

export interface ConfiguracionPorcionamiento {
  IdProductoOrigen: number;
  ProductoOrigen: string;
  IdUnidadOrigen: number;
  UnidadOrigen: string;
  ControlaMerma: boolean;
  PorcentajeMermaReferencial: number;
  Detalles: ConfiguracionPorcionamientoDetalle[];
}

export interface ConfiguracionPorcionamientoDetalle {
  IdProducto: number;
  Producto: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  FactorIdeal: number;
  FactorMaximo: number;
}

export interface PorcionamientoCatalogos {
  SubAreas: PorcionamientoSubArea[];
  ArticulosPorcionables: PorcionamientoArticulo[];
  ArticulosPorcionados: PorcionamientoArticulo[];
  Stocks: PorcionamientoStock[];
  Configuraciones: ConfiguracionPorcionamiento[];
}

export interface PorcionamientoSubArea {
  Id: number;
  Descripcion: string;
  AreaAlmacen: string;
}

export interface PorcionamientoArticulo {
  IdProducto: number;
  Descripcion: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  PrecioCompra: number;
}

export interface PorcionamientoStock {
  IdSubAreaAlmacen: number;
  IdProducto: number;
  Stock: number;
}
