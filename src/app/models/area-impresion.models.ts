export interface AreaImpresion {
  IdAreaImpresion: number;
  Descripcion: string;
  NombreImpresora: string;
}

export interface ValidacionAreaImpresionDispositivo {
  IdAreaImpresion: number;
  Descripcion: string;
  NombreImpresoraConfigurada: string;
  NombreImpresoraValidada: string | null;
  FechaUltimaValidacionUtc: string | null;
  Validada: boolean;
}

export interface ImpresoraValidadaAreaDispositivo {
  IdAreaImpresion: number;
  NombreImpresoraValidada: string;
}

export interface ActualizarValidacionesAreaImpresionDispositivo {
  IdentificadorDispositivo: string;
  ImpresorasValidadas: ImpresoraValidadaAreaDispositivo[];
}

export enum TrabajoImpresionEstadoEnum {
  PENDIENTE = 1,
  EN_PROCESO = 2,
  COMPLETADO = 3,
  FALLIDO = 4,
}

export interface PruebaImpresionAreaEncolada {
  IdTrabajoImpresion: number;
  Estado: TrabajoImpresionEstadoEnum;
  FechaExpiracionUtc: string;
}

export interface EstadoPruebaImpresionArea {
  IdTrabajoImpresion: number;
  Estado: TrabajoImpresionEstadoEnum;
  UltimoError: string | null;
}
