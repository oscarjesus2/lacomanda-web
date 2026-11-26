import { validarNumeroPedidoOffline } from './validar-numero-pedido-offline.mjs';

/** Comprueba el acuse que envía la estación después de imprimir. */
export function validarConfirmacionImpresionOffline(solicitud) {
  if (!solicitud || typeof solicitud !== 'object') throw new TypeError('La confirmación no es válida.');
  validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idOperacion);
  validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idOperacionPedido);
  if (!Number.isSafeInteger(solicitud.idUsuario) || solicitud.idUsuario <= 0
      || typeof solicitud.numeroOffline !== 'string'
      || !Array.isArray(solicitud.impresoras) || solicitud.impresoras.length === 0
      || solicitud.impresoras.some(nombre => typeof nombre !== 'string' || !nombre.trim() || nombre.length > 200)
      || new Set(solicitud.impresoras.map(nombre => nombre.trim().toLowerCase())).size !== solicitud.impresoras.length) {
    throw new TypeError('La confirmación de impresión no es válida.');
  }
}
