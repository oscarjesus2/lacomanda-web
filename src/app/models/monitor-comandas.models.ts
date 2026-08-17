export interface MonitorTurno {
  IdTurno: number;
  NroTurno: number;
  IdCaja: number;
  Caja: string;
  FechaTrabajo: string;
  FechaInicioUtc: string;
  FechaFinUtc?: string | null;
  Estado: string;
  UsuarioApertura: string;
  CantidadComandas: number;
  CantidadCuentas: number;
  CantidadDocumentos: number;
  TotalPedidos: number;
  TotalDocumentos: number;
  CantidadAlertas: number;
}

export interface MonitorPedidoResumen {
  IdPedido: number;
  NroPedido: number;
  FechaPrimerProductoUtc: string;
  FechaUltimaActividadUtc: string;
  CanalVenta: string;
  Espacio: string;
  EmpleadoResponsable: string;
  Origen: string;
  Estado: string;
  CantidadCuentas: number;
  CantidadLineas: number;
  CantidadDocumentos: number;
  Total: number;
  Alertas: string[];
}

export interface MonitorCuenta {
  NroCuenta: number;
  Nombre: string;
  Estado: string;
  Total: number;
  NroPersonas: number;
  UsuarioRegistro: string;
  FechaRegistroUtc: string;
  UsuarioAnulacion?: string | null;
  FechaAnulacionUtc?: string | null;
  MotivoAnulacion?: string | null;
}

export interface MonitorLineaPedido {
  NroCuenta: number;
  Item: number;
  IdProducto: number;
  Producto: string;
  Cantidad: number;
  Precio: number;
  Subtotal: number;
  Descuento: number;
  FechaPedidoUtc: string;
  Estado: string;
  Origen: string;
  Actor: string;
  IdSesionMesaCliente?: number | null;
  EstacionOrigen: string;
  EnviadoImpresion: boolean;
  NumeroEnvios: number;
  NumeroReimpresiones: number;
  FechaReimpresionUtc?: string | null;
  MotivoReimpresion?: string | null;
  IdVenta?: number | null;
  Observacion?: string | null;
  UsuarioAnulacion?: string | null;
  FechaAnulacionUtc?: string | null;
  MotivoAnulacion?: string | null;
}

export interface MonitorPago {
  IdPago: number;
  MetodoPago: string;
  Tarjeta?: string | null;
  Moneda: string;
  SimboloMoneda: string;
  MontoVenta: number;
  MontoPagado: number;
  MontoRecibido?: number | null;
  TipoCambio?: number | null;
  Vuelto: number;
  Propina: number;
  Estado: string;
  FechaRegistroUtc: string;
  Autorizacion?: string | null;
  Observacion?: string | null;
}

export interface MonitorDocumento {
  IdVenta: number;
  TipoDocumento: string;
  Serie: string;
  Correlativo: number;
  NumeroDocumento: string;
  FechaDocumento: string;
  FechaEmisionUtc: string;
  Estado: string;
  Total: number;
  Moneda: string;
  SimboloMoneda: string;
  UsuarioEmision: string;
  FechaAnulacionUtc?: string | null;
  UsuarioAnulacion?: string | null;
  MotivoAnulacion?: string | null;
  Cuentas: number[];
  Pagos: MonitorPago[];
}

export interface MonitorComandaDetalle {
  IdPedido: number;
  NroPedido: number;
  IdTurno: number;
  NroTurno: number;
  FechaTrabajo: string;
  Caja: string;
  CanalVenta: string;
  Espacio: string;
  Ambiente: string;
  EmpleadoResponsable: string;
  Origen: string;
  Estado: string;
  FechaInicioUtc: string;
  FechaUltimaActividadUtc: string;
  Total: number;
  Alertas: string[];
  Cuentas: MonitorCuenta[];
  Lineas: MonitorLineaPedido[];
  Documentos: MonitorDocumento[];
}
