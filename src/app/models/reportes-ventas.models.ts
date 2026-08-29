export type TipoReporteVentas =
  | 'productividad-empleados'
  | 'mesas-servicio'
  | 'productos-sin-rotacion'
  | 'efectividad-descuentos'
  | 'clientes-recurrencia'
  | 'incidencias-operativas'
  | 'calidad-documental'
  | 'incidencias-jornada';

export interface ReporteVentasDefinicion {
  tipo: TipoReporteVentas;
  titulo: string;
  descripcion: string;
  icono: string;
}

export type FormatoColumnaReporte = 'texto' | 'numero' | 'decimal' | 'moneda' | 'porcentaje' | 'fecha' | 'fechaHora' | 'duracion' | 'estado';

export interface ColumnaReporteVentas {
  campo: string;
  etiqueta: string;
  formato?: FormatoColumnaReporte;
}

export interface IndicadorReporteVentas {
  campo: string;
  etiqueta: string;
  icono: string;
  formato?: FormatoColumnaReporte;
  tono?: 'normal' | 'positivo' | 'advertencia' | 'critico';
}

export interface PuntoGraficoReporteVentas {
  etiqueta: string;
  valor: number;
  valorSecundario?: number;
}

export interface ReporteVentasRespuesta {
  FechaDesde: string;
  FechaHasta: string;
  Items: Record<string, unknown>[];
  [key: string]: unknown;
}
