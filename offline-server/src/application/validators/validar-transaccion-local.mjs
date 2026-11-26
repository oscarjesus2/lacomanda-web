import { validarArchivoLocal, validarReferenciaArchivoLocal } from './validar-archivo-local.mjs';

export function validarTransaccionLocal(transaccion, { admitirReferencias = false } = {}) {
  if (!transaccion || typeof transaccion !== 'object'
      || typeof transaccion.id !== 'string'
      || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(transaccion.id)
      || !Array.isArray(transaccion.cambios)
      || transaccion.cambios.length === 0) {
    throw new TypeError('La transacción local no es válida.');
  }
  if (transaccion.operacion !== undefined
      && (!transaccion.operacion || typeof transaccion.operacion !== 'object'
        || Array.isArray(transaccion.operacion)
        || typeof transaccion.operacion.tipo !== 'string'
        || !/^[a-z][a-z0-9-]{0,63}$/.test(transaccion.operacion.tipo)
        || !transaccion.operacion.datos || typeof transaccion.operacion.datos !== 'object'
        || Array.isArray(transaccion.operacion.datos))) {
    throw new TypeError('Los datos de la operación local no son válidos.');
  }
  const registros = new Set();
  for (const cambio of transaccion.cambios) {
    if (!cambio || typeof cambio !== 'object') throw new TypeError('El cambio no es válido.');
    if (admitirReferencias && !Object.hasOwn(cambio, 'contenido')) {
      validarReferenciaArchivoLocal(cambio.tipo, cambio.identificador);
    } else {
      validarArchivoLocal(cambio.tipo, cambio.identificador, cambio.contenido);
    }
    if (cambio.versionEsperada !== undefined
        && (!Number.isSafeInteger(cambio.versionEsperada) || cambio.versionEsperada < 0)) {
      throw new TypeError('La versión esperada del registro no es válida.');
    }
    const clave = `${cambio.tipo}/${cambio.identificador.toLowerCase()}`;
    if (registros.has(clave)) throw new TypeError('La transacción contiene un registro repetido.');
    registros.add(clave);
  }
}
