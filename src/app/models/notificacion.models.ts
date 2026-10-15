import { ConsultaAlertasStockCesia } from './cesia-stock.models';
import { ComprobanteFiscalPendiente } from './comprobante-fiscal-pendiente.models';
import { SolicitudAutorizacion } from './solicitud-autorizacion.models';

export interface TipoNotificacion {
  Codigo: string;
  Nombre: string;
  Descripcion: string;
  Recibir: boolean;
  PermiteCorreo: boolean;
  PermitePush: boolean;
}

export interface NotificacionResumen {
  Id: string;
  CodigoTipo: string;
  Titulo: string;
  Resumen: string;
  FechaUtc: string;
  LeidaUtc: string | null;
}

export interface NotificacionDetalle {
  Notificacion: NotificacionResumen;
  Solicitud: SolicitudAutorizacion | null;
  Stock: ConsultaAlertasStockCesia | null;
  Comprobante: ComprobanteFiscalPendiente | null;
  PuedeResolverSolicitud: boolean;
}

export function tipoNotificacionSolicitud(tipo: string): string {
  return ({ AnularProducto: 'AUT_ANULAR_PRODUCTO', AnularPedido: 'AUT_ANULAR_PEDIDO',
    CambiarCamarero: 'AUT_CAMBIAR_CAMARERO', DescuentoPedido: 'AUT_DESCUENTO_PEDIDO',
    DescuentoEntrada: 'AUT_DESCUENTO_ENTRADA', EntradasGratis: 'AUT_ENTRADAS_GRATIS' } as Record<string, string>)[tipo] ?? '';
}
