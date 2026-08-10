export interface TrabajoImpresion {
  IdTrabajoImpresion: number;
  TokenReclamo: string;
  IdPedido: number;
  NroCuenta: number;
  NombreImpresora: string;
  Documento: string;
  Intento: number;
}

export interface ReclamarTrabajosImpresionRequest {
  IdentificadorEstacion: string;
  Cantidad: number;
}

export interface ConfirmarTrabajoImpresionRequest {
  TokenReclamo: string;
}

export interface FallarTrabajoImpresionRequest {
  TokenReclamo: string;
  Error: string;
}
