export type TipoReporteTermicoAdministracion =
  | 'ventas-producto'
  | 'resumen-ventas'
  | 'resumen-documentos';

export interface TurnoReporteTermico {
  IdTurno: number;
  NroTurno: number;
  IdCaja: number;
  Caja: string;
  FechaTrabajoUtc: string;
  FechaInicioUtc: string;
  FechaFinUtc: string | null;
  Estado: string;
}

export interface FiltroReporteTermicoAdministracion {
  FechaDesde: string;
  FechaHasta: string;
  IdTurno?: number;
}
