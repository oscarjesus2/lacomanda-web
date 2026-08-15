export interface PausaJornada {
  IdPausaJornada: number;
  InicioUtc: Date;
  FinUtc?: Date | null;
}

export interface RegistroJornada {
  IdRegistroJornada: number;
  IdEmpleado: number;
  Empleado: string;
  InicioUtc: Date;
  FinUtc?: Date | null;
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
  InicioUtc: string;
  FinUtc: string;
}

export interface CorregirRegistroJornadaRequest {
  InicioUtc: string;
  FinUtc: string;
  Motivo: string;
  Pausas: PausaJornadaCorreccion[];
}
