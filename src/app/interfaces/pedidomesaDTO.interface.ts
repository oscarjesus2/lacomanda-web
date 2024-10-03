import { PedidoComplemento } from "../models/pedidocomplemento.models";

export interface PedidoMesaDTO {
  IdPedido: number;       // Identificador del pedido
  NroCuenta: number;
  IdMesa: string;         // Identificador de la mesa
  NumeroPedido: string;   // Número del pedido
  FechaPedido: Date;      // Fecha del pedido
  IdMozo: string;         // Identificador del mozo
  NombreMozo: string;     // Nombre del mozo
  IdAmbiente: string;     // Identificador del ambiente (si tu sistema tiene diferentes ambientes)
  EstadoPedido: string;   // Estado del pedido (Ej: "Pendiente", "En Proceso", "Completado", etc.)
  Total: number;          // Total del pedido
  Descuento: number;      // Descuento aplicado al pedido
  Importe: number;        // Importe del pedido
  IdEmpleado: string;
  IdProducto: number;
  Item: number;
  Qty: number;
  FactorComplemento: number;
  NombreCorto: string;
  PermitirParaTragoCortesia: boolean;
  ExclusivoParaAnfitriona: boolean;
  NroCupon: string;
  Precio: number; 
  Cantidad: number;
  Subtotal: number;
  Anfitriona: string;
  Observacion: string;
  Impuesto1: number;
  MontoDescuento: number;
  Ip: string;
  PedidoComplemento: PedidoComplemento[];
}