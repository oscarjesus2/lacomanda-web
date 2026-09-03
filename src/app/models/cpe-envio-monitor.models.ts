export interface ConsultarCpeEnvioMonitorRequest {
  FechaDesde: string;
  FechaHasta: string;
  Busqueda?: string;
}

export interface CpeEnvioMonitorResultado {
  Total: number;
  Pendientes: number;
  EnCola: number;
  Aceptados: number;
  Rechazados: number;
  ConError: number;
  Registros: CpeEnvioMonitorRegistro[];
}

export interface CpeEnvioMonitorRegistro {
  IdVenta: number;
  IdTurno: number;
  FechaEmisionUtc: string;
  TipoDocumento: string;
  NumeroDocumento: string;
  Caja: string;
  Cliente: string;
  Total: number;
  EnvioElectronicoOnline: boolean;
  MomentoEnvio: string;
  EstadoCodigo: string;
  Estado: string;
  Intentos: number;
  FechaEncoladoUtc?: string | null;
  ProximoIntentoUtc?: string | null;
  FechaRespuestaUtc?: string | null;
  CodigoRespuesta?: string | null;
  MensajeRespuesta?: string | null;
  UltimoError?: string | null;
}

