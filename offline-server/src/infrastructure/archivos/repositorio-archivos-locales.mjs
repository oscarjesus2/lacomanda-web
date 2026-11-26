import { link, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validarArchivoLocal } from '../../application/validators/validar-archivo-local.mjs';
import { serializarJsonLocal } from '../../application/validators/serializar-json-local.mjs';

/** Almacena un archivo JSON por registro; todavía no implementa operaciones de venta. */
export class RepositorioArchivosLocales {
  constructor(directorioRaiz) {
    if (typeof directorioRaiz !== 'string' || !directorioRaiz.trim()) {
      throw new TypeError('El directorio de datos es obligatorio.');
    }
    this.directorioRaiz = resolve(directorioRaiz);
  }

  async crear(tipo, identificador, contenido) {
    validarArchivoLocal(tipo, identificador, contenido);
    const datos = JSON.stringify(JSON.parse(serializarJsonLocal(contenido)), null, 2) + '\n';
    const directorio = join(this.directorioRaiz, tipo);
    const destino = join(directorio, `${identificador}.json`);
    await mkdir(directorio, { recursive: true });

    // Se escribe en el mismo directorio para publicar únicamente contenido completo.
    const temporal = join(directorio, `.${randomUUID()}.tmp`);
    let archivo;
    try {
      archivo = await open(temporal, 'wx');
      await archivo.writeFile(datos, 'utf8');
      await archivo.sync();
      await archivo.close();
      archivo = undefined;
      try {
        // El enlace es exclusivo: nunca reemplaza un registro existente.
        await link(temporal, destino);
        return 'creado';
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
        const existente = await readFile(destino, 'utf8');
        if (existente === datos) return 'existente';
        throw new Error('Ya existe un archivo distinto con este identificador.');
      }
    } finally {
      if (archivo) await archivo.close();
      await unlink(temporal).catch(error => {
        if (error?.code !== 'ENOENT') throw error;
      });
    }
  }

  async obtener(tipo, identificador) {
    validarArchivoLocal(tipo, identificador, {});
    const archivo = join(this.directorioRaiz, tipo, `${identificador}.json`);
    return JSON.parse(await readFile(archivo, 'utf8'));
  }
}
