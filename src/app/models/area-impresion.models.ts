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
