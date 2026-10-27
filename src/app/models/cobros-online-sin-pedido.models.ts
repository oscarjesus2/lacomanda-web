export interface CobroOnlineSinPedido {
  IdIntento: string;
  IdSesionMesaCliente: number;
  Proveedor: string;
  Importe: number;
  Moneda: string;
  Estado: string;
  Referencia: string;
  CreadoUtc: Date;
  PagadoUtc?: Date;
  ErrorDevolucion?: string;
}

export interface VincularCobroOnlineAPedido {
  IdPedido: number;
  NroCuenta: number;
}
