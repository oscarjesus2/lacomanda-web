export interface PedidoDeliveryDTO {
  IdPedido: number;       // Identificador del pedido
  NroCuenta: number;
  IdEspacio: number | null;  // Identificador del espacio original
  NroPedido: string;   // Número del pedido
  Cliente: string;
  IdCanalVenta: number;
  Estado: number;
  Total: number;
  FechaPedido?: Date | string; // Fecha del pedido
  Posicion: number;
  Visible: boolean;
}

export interface PedidoResumenTurnoDTO {
  IdPedido: number;
  NroCuenta: number;
  NroPedido: string;
  Cliente: string;
  Total: number;
  IdEspacio: number | null;
  IdCanalVenta: number;
  Estado: number;
  FechaPedido: Date | string;
}
