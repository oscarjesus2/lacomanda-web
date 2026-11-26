const TIPOS = new Set(['pedidos', 'comprobantes-pendientes', 'estado-local']);
const NOMBRE_VALIDO = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const NOMBRES_RESERVADOS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function validarReferenciaArchivoLocal(tipo, identificador) {
  if (!TIPOS.has(tipo)) {
    throw new TypeError('El tipo de archivo local no es válido.');
  }
  if (typeof identificador !== 'string'
      || !NOMBRE_VALIDO.test(identificador)
      || NOMBRES_RESERVADOS.test(identificador)) {
    throw new TypeError('El identificador del archivo no es válido.');
  }
}

export function validarArchivoLocal(tipo, identificador, contenido) {
  validarReferenciaArchivoLocal(tipo, identificador);
  if (contenido === null || typeof contenido !== 'object' || Array.isArray(contenido)) {
    throw new TypeError('El contenido debe ser un objeto.');
  }
}
