export interface AreaImpresion {
  IdAreaImpresion: number;
  Descripcion: string;
  NombreImpresora: string;
}

export interface ConfiguracionImpresionDispositivo {
  IdAreaImpresion: number;
  Descripcion: string;
  NombreImpresoraPredeterminada: string;
  NombreImpresora: string | null;
  FechaUltimaValidacionUtc: string | null;
  Configurada: boolean;
}

export interface ImpresoraAreaDispositivo {
  IdAreaImpresion: number;
  NombreImpresora: string;
}

export interface ActualizarConfiguracionImpresionDispositivo {
  IdentificadorDispositivo: string;
  Impresoras: ImpresoraAreaDispositivo[];
}
