const NOMBRE_MAESTRO = /^[a-z][a-z0-9-]{0,63}$/;

export function validarMaestrosLocales(version, maestros) {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new TypeError('La versión de sincronización no es válida.');
  }
  if (!maestros || typeof maestros !== 'object' || Array.isArray(maestros)) {
    throw new TypeError('Los maestros deben ser un objeto.');
  }
  const nombres = Object.keys(maestros);
  if (!nombres.includes('productos') || !nombres.includes('mesas')) {
    throw new TypeError('La sincronización debe incluir productos y mesas.');
  }
  for (const nombre of nombres) {
    if (!NOMBRE_MAESTRO.test(nombre)) {
      throw new TypeError('El nombre del maestro no es válido.');
    }
    if (maestros[nombre] === null || typeof maestros[nombre] !== 'object') {
      throw new TypeError('Cada maestro debe contener un objeto o una lista.');
    }
  }
}
