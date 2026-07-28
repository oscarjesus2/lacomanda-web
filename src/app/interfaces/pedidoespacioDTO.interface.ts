import { PedidoComplemento } from "../models/pedidocomplemento.models";
import { PedidoMenu } from "../models/pedidomenu.models";

export interface PedidoEspacioDTO {
  IdPedido: number;       // Identificador del pedido
  NroCuenta: number;
  NroPax: number;
  IdEspacio: string;         // Identificador de la espacio
  Cliente: string;
  Direccion: string;
  Referencia: string;
  IdClienteDelivery: number | null;
  ItemClienteDelivery: number | null;
  TelefonoDelivery: string;
  AnexoDelivery: string;
  IdSocioNegocio: number | null;
  NroPedido: string;   // Número del pedido
  FechaApertura: Date;  // Fecha en que se registró la cabecera del pedido
  FechaEnvio: Date | null; // Fecha en que el producto fue enviado a cocina (null si aún no fue)
  IdMozo: string;         // Identificador del mozo
  NombreMozo: string;     // Nombre del mozo
  IdAmbiente: string;     // Identificador del ambiente (si tu sistema tiene diferentes ambientes)
  EstadoPedido: string;   
  Total: number;          // Total del pedido
  Descuento: number;      
  Importe: number;        
  IdEmpleado: number;
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
  PedidoMenu: PedidoMenu[];
  Tipo: number;
  IdSeccionMenu: number;
}
