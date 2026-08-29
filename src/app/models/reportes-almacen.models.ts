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
  IdVenta: number;
  Fecha: string;
  TipoDocumento: string;
  Serie: string;
  NumeroDocumento: number;
  Documento: string;
  IdTurno: number;
  NroTurno: number;
  CanalVenta: string;
  IdMoneda: string;
  TotalVenta: number;
  TurnoCerrado: boolean;
  CostoDisponible: boolean;
  TieneDetalleCosto: boolean;
  TotalCosto: number | null;
  Diferencia: number | null;
  MargenPorcentaje: number | null;
}

export interface VentaCostoReporte {
  FechaDesde: string;
  FechaHasta: string;
  CantidadVentas: number;
  CantidadVentasConCosto: number;
  CantidadVentasSinCosto: number;
  TotalVentaAnalizada: number;
  TotalCosto: number;
  Diferencia: number;
  MargenPorcentaje: number;
  Items: VentaCostoReporteItem[];
}

export interface ConsumoTeoricoRealReporteItem {
  IdInventario: number;
  FechaInventario: string;
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
  IdArticulo: number;
  Articulo: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  StockInicio: number;
  Ingresos: number;
  ConsumoTeorico: number;
  StockSistema: number;
  StockContado: number;
  ConsumoReal: number;
  Diferencia: number;
  DiferenciaPorcentaje: number | null;
}

export interface ConsumoTeoricoRealReporte {
  FechaDesde: string;
  FechaHasta: string;
  CantidadInventarios: number;
  CantidadArticulos: number;
  CantidadLineas: number;
  CantidadLineasConDiferencia: number;
  Items: ConsumoTeoricoRealReporteItem[];
}

export interface RentabilidadProductoCanalReporteItem {
  IdProducto: number;
  Producto: string;
  IdCanalVenta: number;
  CanalVenta: string;
  IdMoneda: string;
  CantidadVendida: number;
  CantidadAnalizada: number;
  VentaTotal: number;
  VentaAnalizada: number;
  VentaSinCosto: number;
  TotalCosto: number;
  VentasSinCosto: number;
  Margen: number;
  MargenPorcentaje: number;
}

export interface RentabilidadProductoCanalReporte {
  FechaDesde: string;
  FechaHasta: string;
  CantidadProductos: number;
  VentaTotal: number;
  VentaAnalizada: number;
  VentaSinCosto: number;
  TotalCosto: number;
  Margen: number;
  MargenPorcentaje: number;
  Items: RentabilidadProductoCanalReporteItem[];
}

export type CoberturaStockEstado =
  | 'SIN_STOCK'
  | 'BAJO_MINIMO'
  | 'SOBRE_MAXIMO'
  | 'SIN_CONSUMO'
  | 'DISPONIBLE';

export interface CoberturaStockReporteItem {
  IdArticulo: number;
  Articulo: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  StockActual: number;
  StockMinimo: number;
  StockMaximo: number;
  CantidadUbicaciones: number;
  ConsumoPeriodo: number;
  ConsumoPromedioDiario: number;
  DiasCobertura: number | null;
  FechaAgotamientoEstimada: string | null;
  Estado: CoberturaStockEstado;
}

export interface CoberturaStockReporte {
  FechaDesde: string;
  FechaHasta: string;
  DiasPeriodo: number;
  CantidadArticulos: number;
  ArticulosSinStock: number;
  ArticulosBajoMinimo: number;
  ArticulosSinConsumo: number;
  Items: CoberturaStockReporteItem[];
}
