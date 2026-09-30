import { Cliente } from './cliente.models';

export interface VentaDirectaProductoImpuesto {
  IdImpuestoPais: string;
  Tasa: number;
  FijoPorUnidad: number;
}

export interface VentaDirectaProducto {
  IdProducto: number;
  NombreCorto: string;
  Precio: number;
  PrecioMinimo: number;
  SinPrecio: boolean;
  IdMoneda: string;
  Tipo: number;
  ExclusivoParaAnfitriona: boolean;
  PermitirParaTragoCortesia: boolean;
  Impuestos: VentaDirectaProductoImpuesto[];
}

export interface VentaDirectaDetalle {
  IdProducto: number;
  Cantidad: number;
  Precio: number;
}

export interface VentaDirectaPago {
  IdTipoPago: number;
  MontoPagado: number;
  MontoRecibido?: number;
  TipoCambio?: number;
  IdTarjeta?: number | null;
  Autorizacion?: string;
  Observacion?: string;
  IdMoneda?: string;
}

export interface EmitirVentaDirectaRequest {
  IdCaja: number;
  IdTipoDocumento: number;
  FechaDocumento?: string;
  Observacion?: string;
  UsarClienteGenerico: boolean;
  Cliente: Cliente | null;
  Detalles: VentaDirectaDetalle[];
  Pagos: VentaDirectaPago[];
}
