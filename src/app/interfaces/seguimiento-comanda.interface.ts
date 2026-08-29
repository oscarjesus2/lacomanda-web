export interface SeguimientoComandaFiltro {
  IdTurno?: number;
  Desde?: string;
  Hasta?: string;
}

export interface SeguimientoComandaReporte {
  Comandas: SeguimientoComandaResumen[];
  ProductosAnulados: SeguimientoProductoAnulado[];
  Descuentos: SeguimientoDescuento[];
  CantidadComandas: number;
  TotalPagado: number;
  TotalPendiente: number;
  TotalAnulado: number;
  TotalProductosAnulados: number;
  TotalDescuentos: number;
}

export interface SeguimientoComandaResumen {
  IdPedido: number;
  IdTurno: number;
  FechaTrabajo: string;
  FechaRegistro: string;
  TipoPedido: string;
  NroPedido: number;
  NroCuenta: number;
  Mesa: string;
  NumeroMesa?: number;
  NroPax: number;
  Mozo: string;
  Descuento: number;
  Total: number;
  Estado: string;
  UsuarioRegistra: string;
}

export interface SeguimientoProductoAnulado {
  IdPedido: number;
  IdTurno: number;
  FechaTrabajo: string;
  TipoPedido: string;
  NroPedido: number;
  NroCuenta: number;
  Item: number;
  Producto: string;
  Cantidad: number;
  Subtotal: number;
  UsuarioAnula: string;
  FechaAnula?: string;
  MotivoAnula: string;
}

export interface SeguimientoDescuento {
  IdPedido: number;
  IdTurno: number;
  FechaTrabajo: string;
  TipoPedido: string;
  NroPedido: number;
  NroCuenta: number;
  Item: number;
  TipoDescuento: string;
  Producto: string;
  Cantidad: number;
  Subtotal: number;
  MontoDescuento: number;
  Estado: string;
  UsuarioDescuento: string;
  FechaDescuento?: string;
}

export interface ComisionAnfitrionaReporte {
  Detalles: ComisionAnfitrionaDetalle[];
  CantidadFichas: number;
  TotalAsignado: number;
}

export interface ComisionAnfitrionaDetalle {
  IdTurno: number;
  FechaTrabajo: string;
  NroPedido: number;
  NroCuenta: number;
  Item: number;
  Anfitrionas: string;
  CantidadAnfitrionas: number;
  Producto: string;
  Precio: number;
  Cantidad: number;
  ImporteNeto: number;
  ImportePorAnfitriona: number;
  FechaReimpresion?: string;
  NumeroReimpresiones: number;
  TipoIngreso: string;
}
