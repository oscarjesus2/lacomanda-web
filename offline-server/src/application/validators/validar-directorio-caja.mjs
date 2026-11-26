import { isAbsolute } from 'node:path';

/** Evita configurar una carpeta compartida mediante una ruta UNC. */
export function validarDirectorioCaja(directorio) {
  if (typeof directorio !== 'string' || !isAbsolute(directorio)
      || directorio.startsWith('\\\\') || directorio.startsWith('//')) {
    throw new Error('El directorio de datos debe ser una ruta local absoluta en caja.');
  }
}
