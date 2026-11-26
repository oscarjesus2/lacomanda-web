import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { RepositorioArchivosLocales } from './repositorio-archivos-locales.mjs';
import { comprobarContextoCaja } from '../../application/validators/validar-contexto-caja.mjs';

/** Se ejecuta bajo el bloqueo de instancia, antes de abrir el diario o publicar datos. */
export async function vincularDirectorioCaja(directorio, contexto, maestros) {
  const archivos = new RepositorioArchivosLocales(directorio);
  const ruta = join(directorio, 'estado-local', 'contexto-caja.json');
  try {
    comprobarContextoCaja(JSON.parse(await readFile(ruta, 'utf8')), contexto);
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (await contieneDatos(directorio)) {
    // Una copia antigua solo se adopta si identifica la misma sucursal y estación.
    comprobarContextoCaja((await maestros.obtener())?.maestros?.contexto, contexto);
  }
  await archivos.crear('estado-local', 'contexto-caja', contexto);
}

async function contieneDatos(directorio) {
  // El prototipo podía crear la estructura vacía al iniciar y no registrar ninguna operación.
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    if (!entrada.isDirectory() || await contieneDatos(join(directorio, entrada.name))) return true;
  }
  return false;
}

