import { Producto } from './product.models';
import { SocioNegocio } from './socionegocio.models';

export interface DeliveryCliente {
  IdCliente: number;
  Item: number;
  NumeroIdentificacion: string;
  IdTipoIdentidad: string;
  RazonSocial: string;
  NombresDelivery: string;
  TelefonoDelivery: string;
  AnexoDelivery: string;
  DireccionDelivery: string;
  ReferenciaDelivery: string;
  CorreoDelivery: string;
  PrecioDelivery: number;
}

export interface GuardarDeliveryCliente {
  IdCliente?: number | null;
  Item?: number | null;
  NumeroIdentificacion: string;
  IdTipoIdentidad: string;
  RazonSocial: string;
  NombresDelivery: string;
  TelefonoDelivery: string;
  AnexoDelivery?: string;
  DireccionDelivery: string;
  ReferenciaDelivery?: string;
  CorreoDelivery?: string;
  PrecioDelivery: number;
}

export interface DeliveryContexto {
  ProductoCargoDelivery: Producto | null;
}

export interface DeliveryHistorialDetalle {
  Producto: string;
  Cantidad: number;
  Precio: number;
  Subtotal: number;
}

export interface DeliveryHistorial {
  IdVenta: number;
  Documento: string;
  Fecha: string;
  Total: number;
  Detalles: DeliveryHistorialDetalle[];
}

export interface DeliveryDialogData {
  SociosNegocio: SocioNegocio[];
  IdTurno: number;
}

export type DeliveryModalidad = 'SOCIO_NEGOCIO' | 'TELEFONO';

export interface ProductoPrecioSocioNegocio {
  IdProducto: number;
  Precio: number;
}

export interface DeliveryMotorizado {
  IdEmpleado: number;
  Nombre: string;
  Telefono: string;
}

export interface DeliveryPedidoPendiente {
  IdPedido: number;
  NroCuenta: number;
  NroPedido: number;
  Cliente: string;
  Direccion: string;
  Telefono: string;
  Total: number;
  PagoRegistrado: boolean;
  IdMotorizado: number | null;
  Motorizado: string | null;
  FechaAsignacionMotorizado: string | null;
}

export interface DeliveryOperacion {
  Pedidos: DeliveryPedidoPendiente[];
  Motorizados: DeliveryMotorizado[];
}

export interface DeliveryDialogResult {
  Accion: 'CREAR_PEDIDO' | 'COBRAR_ENTREGA';
  Modalidad: DeliveryModalidad;
  NombreCliente: string;
  Cliente: DeliveryCliente | null;
  SocioNegocio: SocioNegocio | null;
  ProductoCargoDelivery: Producto | null;
  PreciosSocioNegocio: ProductoPrecioSocioNegocio[];
  Pedido?: DeliveryPedidoPendiente;
}
