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
