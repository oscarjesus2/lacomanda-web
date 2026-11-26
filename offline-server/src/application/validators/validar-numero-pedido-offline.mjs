export function validarNumeroPedidoOffline(idEstacion, idOperacion) {
  if (!Number.isSafeInteger(idEstacion) || idEstacion <= 0) {
    throw new TypeError('La estación del pedido no es válida.');
  }
  validarIdOperacion(idOperacion);
}

export function validarIdOperacion(idOperacion) {
  if (typeof idOperacion !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOperacion)) {
    throw new TypeError('El identificador de operación debe ser un UUID válido.');
  }
}
