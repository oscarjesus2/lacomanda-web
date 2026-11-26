/** No permite que JSON descarte valores o convierta importes inválidos sin avisar. */
export function serializarJsonLocal(valor) {
  const json = JSON.stringify(valor, (_clave, actual) => {
    if (actual === undefined || typeof actual === 'function' || typeof actual === 'symbol'
        || typeof actual === 'bigint' || (typeof actual === 'number' && !Number.isFinite(actual))) {
      throw new TypeError('Los datos contienen un valor que no se puede guardar en JSON.');
    }
    return actual;
  });
  if (json === undefined) throw new TypeError('Los datos no se pueden guardar en JSON.');
  return json;
}
