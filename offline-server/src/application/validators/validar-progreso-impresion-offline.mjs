import { validarNumeroPedidoOffline } from './validar-numero-pedido-offline.mjs';
import { validarConfirmacionImpresionOffline } from './validar-confirmacion-impresion-offline.mjs';
import { validarComandaOffline } from './validar-comanda-offline.mjs';

/** Comprueba las peticiones para conservar el progreso por comanda. */
export function validarProgresoImpresionOffline(solicitud) {
  if (!solicitud || typeof solicitud !== 'object' || Array.isArray(solicitud)
      || !['crear', 'consultar', 'iniciar', 'aceptar', 'resolver'].includes(solicitud.accion)) {
    throw new TypeError('La solicitud de impresión no es válida.');
  }
  validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idOperacionPedido);
  if (!Number.isSafeInteger(solicitud.idUsuario) || solicitud.idUsuario <= 0) {
    throw new TypeError('El usuario de impresión no es válido.');
  }
  if (solicitud.accion === 'crear') {
    if (!Array.isArray(solicitud.trabajos) || solicitud.trabajos.length === 0 || solicitud.trabajos.length > 100) {
      throw new TypeError('Las comandas no son válidas.');
    }
    if (typeof solicitud.idOperacion === 'string'
        && solicitud.idOperacion.toLowerCase() === solicitud.idOperacionPedido.toLowerCase()) {
      throw new TypeError('La confirmación debe tener un identificador distinto al pedido.');
    }
    const impresoras = [];
    for (const trabajo of solicitud.trabajos) {
      if (!trabajo || typeof trabajo.impresora !== 'string' || !trabajo.impresora.trim()
          || trabajo.impresora.length > 200) throw new TypeError('La impresora no es válida.');
      const fecha = trabajo.datos?.fechaUtc;
      if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(fecha)
          || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString() !== fecha
          || Object.hasOwn(trabajo.datos, 'fechaLocal')) {
        throw new TypeError('La fecha de impresión debe conservarse en UTC.');
      }
      validarComandaOffline({ ...trabajo.datos, fechaLocal: 'se presenta en la estación' });
      if (trabajo.datos.numeroPedido !== solicitud.numeroOffline) {
        throw new TypeError('La comanda no corresponde al pedido.');
      }
      if (!impresoras.some(nombre => nombre.toLowerCase() === trabajo.impresora.trim().toLowerCase())) {
        impresoras.push(trabajo.impresora.trim());
      }
    }
    validarConfirmacionImpresionOffline({ ...solicitud, impresoras });
  } else if (solicitud.accion !== 'consultar') {
    if (!Number.isSafeInteger(solicitud.indice) || solicitud.indice < 0) {
      throw new TypeError('El índice de comanda no es válido.');
    }
    validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idIntento);
    if (solicitud.accion === 'resolver' && !['impresa', 'reimprimir'].includes(solicitud.decision)) {
      throw new TypeError('La decisión de impresión no es válida.');
    }
  }
}
