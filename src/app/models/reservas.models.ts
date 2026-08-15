export interface HorarioReserva {
  DiaSemana: number;
  HoraInicio: string;
  HoraFin: string;
}

export interface ConfiguracionReservas {
  Restaurante: string;
  Direccion: string;
  Publicada: boolean;
  ConfirmacionAutomatica: boolean;
  DuracionMinutos: number;
  IntervaloMinutos: number;
  AnticipacionMinimaMinutos: number;
  DiasAntelacion: number;
  CancelacionMinimaMinutos: number;
  MaximoPersonasPorReserva: number;
  MensajePublico?: string;
  TelefonoContacto?: string;
  MesasHabilitadas: number;
  Horarios: HorarioReserva[];
}

export interface EspacioReserva {
  IdEspacio: number;
  Ambiente: string;
  Mesa: string;
  AceptaReservas: boolean;
  CapacidadReserva: number;
}

export interface Reserva {
  IdReserva: number;
  Codigo: string;
  ClienteNombre: string;
  ClienteTelefono: string;
  ClienteEmail?: string;
  Personas: number;
  InicioUtc: string;
  FinUtc: string;
  Estado: string;
  IdEspacio?: number;
  Mesa: string;
  Ambiente: string;
  NotasCliente?: string;
  NotasInternas?: string;
  Origen: string;
  CreadaUtc: string;
}

export interface DisponibilidadReserva {
  Fecha: string;
  Personas: number;
  Horas: string[];
}

export interface ReservaCreada {
  Codigo: string;
  TokenGestion: string;
  Estado: string;
  InicioUtc: string;
  Personas: number;
}
