export interface TrabajoImpresion {
  IdTrabajoImpresion: number;
  TokenReclamo: string;
  IdPedido: number;
  NroCuenta: number;
  NombreImpresora: string;
  Documento: string;
  Intento: number;
  EsPrueba: boolean;
}

export interface ReclamarTrabajosImpresionRequest {
  IdentificadorEstacion: string;
  Cantidad: number;
  QzDisponible: boolean;
  AdmitePruebas: boolean;
}

export interface ConfirmarTrabajoImpresionRequest {
  TokenReclamo: string;
}

export interface FallarTrabajoImpresionRequest {
  TokenReclamo: string;
  Error: string;
}
