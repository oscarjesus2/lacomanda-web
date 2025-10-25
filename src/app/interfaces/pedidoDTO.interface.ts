export interface PedidoDeliveryDTO {
  IdPedido: number;       // Identificador del pedido
  NroCuenta: number;
  IdMesa: string;         // Identificador de la mesa
  NroPedido: string;   // Número del pedido
  Cliente: string;
  IdCanalVenta: number;
  Estado: number;
  Total: number;
  FechaPedido: Date;      // Fecha del pedido
  Posicion: number;
  Visible: boolean;
}