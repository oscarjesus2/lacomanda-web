export interface ConsumoAreaReporteItem {
  IdArticulo: number;
  Articulo: string;
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
  IdUnidadArticulo: number | null;
  UnidadArticulo: string;
  IdUnidadReceta: number | null;
  UnidadReceta: string;
  TipoUnidad: number;
  FactorReceta: number;
  CantidadReceta: number;
  Consumo: number;
}

export interface ConsumoAreaReporte {
  FechaDesde: string;
  FechaHasta: string;
  IdSubAreaAlmacen: number | null;
  SubAreaAlmacen: string | null;
  Items: ConsumoAreaReporteItem[];
}

export interface VentaCostoReporteItem {
  IdProducto: number;
  Producto: string;
  PrecioVenta: number;
  CostoMesa: number;
  CostoLlevar: number;
  CostoDelivery: number;
  CantidadVendida: number;
  TotalVenta: number;
  TotalCostoMesa: number;
  TotalCostoLlevar: number;
  TotalCostoDelivery: number;
  TotalCosto: number;
  Diferencia: number;
}

export interface VentaCostoReporte {
  FechaDesde: string;
  FechaHasta: string;
  CantidadProductos: number;
  CantidadVendida: number;
  TotalVenta: number;
  TotalCosto: number;
  Diferencia: number;
  Items: VentaCostoReporteItem[];
}
