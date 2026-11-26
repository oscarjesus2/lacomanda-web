/** No confirma localmente un lote sin una respuesta completa para cada operación. */
export function validarConfirmacionLote(lote, respuesta) {
  if (respuesta?.confirmado !== true || respuesta.id !== lote.id
      || !Array.isArray(respuesta.resultados) || respuesta.resultados.length !== lote.operaciones.length) {
    throw new Error('La nube no confirmó el lote completo.');
  }
  const resultados = new Map();
  for (const resultado of respuesta.resultados) {
    if (!resultado || typeof resultado.idOperacion !== 'string' || resultados.has(resultado.idOperacion)) {
      throw new Error('La nube devolvió resultados de regularización no válidos.');
    }
    resultados.set(resultado.idOperacion, resultado);
  }
  for (const operacion of lote.operaciones) {
    const resultado = resultados.get(operacion.id);
    if (!resultado) throw new Error('La nube no confirmó todas las operaciones.');
    if (operacion.operacion.tipo === 'registrar-pedido'
        && (resultado.numeroOffline !== operacion.operacion.datos.numeroOffline
          || !Number.isSafeInteger(resultado.idPedido) || resultado.idPedido <= 0
          || !Number.isSafeInteger(resultado.nroPedido) || resultado.nroPedido <= 0
          || !Number.isSafeInteger(resultado.nroCuenta) || resultado.nroCuenta <= 0)) {
      throw new Error('La nube no devolvió la correspondencia completa del pedido.');
    }
    if (operacion.operacion.tipo === 'registrar-cobro'
        && (!Number.isSafeInteger(resultado.idVenta) || resultado.idVenta <= 0
          || typeof resultado.serie !== 'string' || !resultado.serie.trim()
          || !Number.isSafeInteger(resultado.numeroDocumento) || resultado.numeroDocumento <= 0)) {
      throw new Error('La nube no devolvió los datos del comprobante emitido.');
    }
  }
}
