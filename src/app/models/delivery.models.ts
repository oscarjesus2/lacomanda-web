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
}

export type DeliveryModalidad = 'SOCIO_NEGOCIO' | 'TELEFONO';

export interface ProductoPrecioSocioNegocio {
  IdProducto: number;
  Precio: number;
}

export interface DeliveryDialogResult {
  Modalidad: DeliveryModalidad;
  NombreCliente: string;
  Cliente: DeliveryCliente | null;
  SocioNegocio: SocioNegocio | null;
  ProductoCargoDelivery: Producto | null;
  PreciosSocioNegocio: ProductoPrecioSocioNegocio[];
}
