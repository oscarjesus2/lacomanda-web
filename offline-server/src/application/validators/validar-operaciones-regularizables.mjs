import { validarTransaccionLocal } from './validar-transaccion-local.mjs';
import { validarConfirmacionImpresionOffline } from './validar-confirmacion-impresion-offline.mjs';

/** No se envían proyecciones que no indiquen la operación que las originó. */
export function validarOperacionesRegularizables(operaciones) {
  if (!Array.isArray(operaciones) || operaciones.length === 0) {
    throw new TypeError('El lote debe contener operaciones.');
  }
  const pedidos = new Map();
  const impresiones = new Map();
  for (const operacion of operaciones) {
    validarTransaccionLocal(operacion, { admitirReferencias: true });
    if (!operacion.operacion) {
      throw new Error('El diario contiene cambios sin los datos necesarios para regularizarlos.');
    }
    if (operacion.operacion.tipo === 'registrar-pedido') {
      const datos = operacion.operacion.datos;
      if (datos?.solicitud?.idOperacion !== operacion.id || typeof datos.numeroOffline !== 'string') {
        throw new Error('El pedido no contiene la referencia necesaria para regularizarlo.');
      }
      registrarImpresionRequerida(pedidos, operacion, datos.numeroOffline);
    }
    if (operacion.operacion.tipo === 'confirmar-impresion') {
      const confirmacion = operacion.operacion.datos?.solicitud;
      validarConfirmacionImpresionOffline(confirmacion);
      if (confirmacion.idOperacion !== operacion.id) {
        throw new Error('La confirmación de impresión no es válida.');
      }
      const referencia = confirmacion.idOperacionPedido.toLowerCase();
      if (impresiones.has(referencia)) throw new Error('El pedido tiene confirmaciones de impresión repetidas.');
      impresiones.set(referencia, confirmacion.numeroOffline);
    }
    if (operacion.operacion.tipo === 'modificar-pedido') {
      const solicitud = operacion.operacion.datos?.solicitud;
      if (solicitud?.idOperacion !== operacion.id || !solicitud.referenciaPedido) throw new Error('La modificación no corresponde al pedido.');
      if (['agregar-productos', 'anular-producto', 'anular-pedido'].includes(solicitud.accion)) {
        registrarImpresionRequerida(pedidos, operacion, solicitud.referenciaPedido);
      }
    }
  }
  for (const [id, numero] of pedidos) {
    if (impresiones.get(id) !== numero) throw new Error('Hay pedidos sin confirmación de impresión.');
  }
  for (const [id, numero] of impresiones) {
    if (pedidos.get(id) !== numero) throw new Error('La confirmación no corresponde a un pedido del lote.');
  }
}

function registrarImpresionRequerida(pedidos, operacion, referencia) {
  if (operacion.operacion.datos.impresionNoRequerida === true) {
    if (operacion.cambios.some(cambio => cambio.tipo === 'estado-local' && cambio.identificador.startsWith('plan-'))) {
      throw new Error('El movimiento tiene un plan de impresión que requiere confirmación.');
    }
    return;
  }
  pedidos.set(operacion.id.toLowerCase(), referencia);
}
