export interface AreaImpresion {
  IdAreaImpresion: number;
  Descripcion: string;
  NombreImpresora: string;
}

export interface ConfiguracionImpresionDispositivo {
  IdAreaImpresion: number;
  Descripcion: string;
  NombreImpresoraConfigurada: string;
  NombreImpresoraValidada: string | null;
  FechaUltimaValidacionUtc: string | null;
  Validada: boolean;
}

export interface ImpresoraAreaDispositivo {
  IdAreaImpresion: number;
  NombreImpresora: string;
}

export interface ActualizarConfiguracionImpresionDispositivo {
  IdentificadorDispositivo: string;
  Impresoras: ImpresoraAreaDispositivo[];
}
