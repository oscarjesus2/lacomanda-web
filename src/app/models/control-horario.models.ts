export interface PausaJornada {
  IdPausaJornada: number;
  InicioUtc: string;
  FinUtc?: string | null;
  InicioLocal: string;
  FinLocal?: string | null;
}

export interface RegistroJornada {
  IdRegistroJornada: number;
  IdEmpleado: number;
  Empleado: string;
  InicioUtc: string;
  FinUtc?: string | null;
  InicioLocal: string;
  FinLocal?: string | null;
  EstaAbierta: boolean;
  EstaEnPausa: boolean;
  MinutosPausa: number;
  MinutosTrabajados: number;
  TieneCorrecciones: boolean;
  Pausas: PausaJornada[];
}

export interface EstadoControlHorario {
  JornadaActual?: RegistroJornada | null;
}

export interface ConsultaControlHorario {
  FechaDesde: string;
  FechaHasta: string;
  TotalMinutosTrabajados: number;
  TotalMinutosPausa: number;
  RegistrosCorregidos: number;
  Registros: RegistroJornada[];
}

export interface PausaJornadaCorreccion {
  InicioLocal: string;
  FinLocal: string;
}

export interface CorregirRegistroJornadaRequest {
  InicioLocal: string;
  FinLocal: string;
  Motivo: string;
  Pausas: PausaJornadaCorreccion[];
}
