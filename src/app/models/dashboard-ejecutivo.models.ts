export interface IndicadoresPeriodoDashboard {
  VentaTotal: number;
  Documentos: number;
  TicketMedio: number;
  VentaAnalizada: number;
  CostoHistorico: number;
  Margen: number;
  MargenPorcentaje: number;
  DocumentosSinCosto: number;
}

export interface ComparativoVentasDashboardPunto {
  Indice: number;
  FechaActual: string;
  FechaAnterior: string;
  VentaActual: number;
  VentaAnterior: number;
}

export interface ComparativoVentasDashboard {
  FechaDesde: string;
  FechaHasta: string;
  FechaDesdeAnterior: string;
  FechaHastaAnterior: string;
  Actual: IndicadoresPeriodoDashboard;
  Anterior: IndicadoresPeriodoDashboard;
  VariacionVentaPorcentaje: number | null;
  VariacionDocumentosPorcentaje: number | null;
  VariacionTicketPorcentaje: number | null;
  VariacionMargenPorcentaje: number | null;
  Puntos: ComparativoVentasDashboardPunto[];
}

export interface EvolucionMargenDashboardPunto {
  Fecha: string;
  VentaTotal: number;
  VentaAnalizada: number;
  CostoHistorico: number;
  Margen: number;
  MargenPorcentaje: number;
  VentaSinCosto: number;
  DocumentosSinCosto: number;
}

export interface EvolucionMargenDashboard {
  FechaDesde: string;
  FechaHasta: string;
  VentaTotal: number;
  VentaAnalizada: number;
  VentaSinCosto: number;
  CostoHistorico: number;
  Margen: number;
  MargenPorcentaje: number;
  DocumentosSinCosto: number;
  Puntos: EvolucionMargenDashboardPunto[];
}

export interface MetodoPagoDashboardItem {
  IdTipoPago: number;
  TipoPago: string;
  NetoMonedaBase: number;
  CantidadPagos: number;
  PagosSinDesgloseOriginal: number;
  Porcentaje: number;
}

export interface MonedaPagoDashboardItem {
  IdMoneda: string;
  Moneda: string;
  Simbolo: string;
  MontoRecibido: number;
  EquivalenteMonedaBase: number;
  VueltoMonedaBase: number;
  NetoMonedaBase: number;
  TipoCambioPromedio: number | null;
  CantidadPagos: number;
  PagosSinDesgloseOriginal: number;
}

export interface MetodosPagoDashboard {
  FechaDesde: string;
  FechaHasta: string;
  TotalNetoMonedaBase: number;
  TotalVueltoMonedaBase: number;
  CantidadPagos: number;
  PagosSinDesgloseOriginal: number;
  Metodos: MetodoPagoDashboardItem[];
  Monedas: MonedaPagoDashboardItem[];
}
