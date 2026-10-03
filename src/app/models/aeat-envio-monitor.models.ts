export interface ConsultarAeatEnvioMonitorRequest {
  FechaDesde: string;
  FechaHasta: string;
  Busqueda?: string;
}

export interface AeatEnvioMonitorResultado {
  Total: number;
  Pendientes: number;
  Aceptados: number;
  AceptadosConErrores: number;
  Rechazados: number;
  ConErrorTecnico: number;
  Registros: AeatEnvioMonitorRegistro[];
}

export interface ReintentarEnviosAeatResultado {
  Encolados: number;
  Omitidos: number;
}

export interface SubsanarRegistroAeatResultado {
  IdRegistro: number;
  IdRegistroOrigen: number;
  NumeroDocumento: string;
  Naturaleza: string;
}

export interface AeatEnvioMonitorRegistro {
  IdRegistro: number;
  IdVenta: number;
  FechaEmisionUtc: string;
  NumeroDocumento: string;
  TipoDocumento: string;
  OperacionCodigo: 'ALTA' | 'ANULACION';
  Operacion: string;
  NaturalezaCodigo: string;
  Naturaleza: string;
  IdRegistroOrigen?: number | null;
  Generacion: number;
  ModoFiscal: string;
  Destinatario: string;
  IdentificacionDestinatario?: string | null;
  TotalDocumento: number;
  EstadoCodigo: string;
  Estado: string;
  Intentos: number;
  CreadoUtc: string;
  EnviadoUtc?: string | null;
  ActualizadoUtc?: string | null;
  CodigoRespuesta?: string | null;
  MensajeRespuesta?: string | null;
  IdPeticionAeat?: string | null;
  ProximoIntentoUtc?: string | null;
  PuedeReintentar: boolean;
  PuedeSubsanar: boolean;
  AccionRecomendada: string;
}
