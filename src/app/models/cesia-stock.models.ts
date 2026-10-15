export type TipoAlertaStockCesia = 'SIN_STOCK' | 'STOCK_BAJO' | 'RIESGO_AGOTAMIENTO';

export interface AlertaStockCesia {
  Clave: string;
  Tipo: TipoAlertaStockCesia;
  IdArticulo: number;
  Articulo: string;
  Unidad: string;
  StockRegistrado: number;
  ConsumoPendiente: number;
  StockEstimado: number;
  StockMinimo: number;
  ConsumoPorHora: number | null;
  HorasHastaAgotamiento: number | null;
}

export interface ConsultaAlertasStockCesia {
  GeneradoUtc: string;
  HorasProyeccion: number;
  HorasObservacion: number;
  ArticulosEvaluados: number;
  ConsumosSinConfiguracion: number;
  Alertas: AlertaStockCesia[];
}
