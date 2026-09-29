import { Cliente } from './cliente.models';

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
  IdTipoDocumento: number;
  FechaDocumento?: string;
  Observacion?: string;
  UsarClienteGenerico: boolean;
  Cliente: Cliente | null;
  Detalles: VentaDirectaDetalle[];
  Pagos: VentaDirectaPago[];
}
