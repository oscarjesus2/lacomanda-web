import { PedidoComplemento } from "../models/pedidocomplemento.models";

export interface PedidoEspacioDTO {
  IdPedido: number;       // Identificador del pedido
  NroCuenta: number;
  NroPax: number;
  IdEspacio: string;         // Identificador de la espacio
  Cliente: string;
  NroPedido: string;   // Número del pedido
  FechaPedido: Date;      // Fecha del pedido
  IdMozo: string;         // Identificador del mozo
  NombreMozo: string;     // Nombre del mozo
  IdAmbiente: string;     // Identificador del ambiente (si tu sistema tiene diferentes ambientes)
  EstadoPedido: string;   
  Total: number;          // Total del pedido
  Descuento: number;      
  Importe: number;        
  IdEmpleado: number;
  HoraPedido: string;
  NombreCuenta: string;
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