export interface SucursalComprobantePublico {
  TenantId: string;
  Nombre: string;
}

export interface TipoDocumentoComprobantePublico {
  IdTipoDocumento: number;
  Descripcion: string;
}

export interface ConfiguracionComprobantesPublicos {
  PaisISO2: string;
  TiposDocumento: TipoDocumentoComprobantePublico[];
  TiposIdentidad: string[];
}

export interface ConsultarComprobantePublicoRequest {
  TipoDocumento: number;
  Serie: string;
  Numero: number;
  NumeroIdentificacion: string;
  FechaEmision: string;
  Total: number;
}

export interface ComprobantePublico {
  TipoDocumento: string;
  NumeroDocumento: string;
  FechaEmision: string;
  Total: number;
  Moneda: string;
  XmlDisponible: boolean;
  PdfDisponible: boolean;
}
