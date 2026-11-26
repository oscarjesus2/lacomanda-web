import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serializarJsonLocal } from '../../application/validators/serializar-json-local.mjs';
import { validarContextoCaja } from '../../application/validators/validar-contexto-caja.mjs';

/** Mantiene estable el lote enviado hasta recibir confirmación de la nube. */
export class RepositorioLotesLocales {
  constructor(directorioRaiz) {
    if (typeof directorioRaiz !== 'string' || !directorioRaiz.trim()) {
      throw new TypeError('El directorio de datos es obligatorio.');
    }
    this.raiz = join(resolve(directorioRaiz), 'lotes');
    this.cola = Promise.resolve();
  }

  ejecutarExclusivo(accion) {
    const trabajo = this.cola.then(accion);
    this.cola = trabajo.catch(() => undefined);
    return trabajo;
  }

  async obtenerCursor() {
    const cursor = await leerOpcional(join(this.raiz, 'cursor.json'));
    if (!cursor) return { hastaSecuencia: 0, ultimoLoteId: null };
    if (!Number.isSafeInteger(cursor.hastaSecuencia) || cursor.hastaSecuencia < 0
        || typeof cursor.ultimoLoteId !== 'string') {
      throw new Error('El cursor de regularización no es válido.');
    }
    return cursor;
  }

  async obtenerActivo() {
    const lote = await leerOpcional(join(this.raiz, 'activo.json'));
    if (!lote) return null;
    validarLoteGuardado(lote);
    const cursor = await this.obtenerCursor();
    if (cursor.ultimoLoteId === lote.id && cursor.hastaSecuencia === lote.hastaSecuencia) {
      return null;
    }
    if (lote.desdeSecuencia !== cursor.hastaSecuencia + 1) {
      throw new Error('El lote pendiente no coincide con el cursor local.');
    }
    return lote;
  }

  async guardarActivo(lote) {
    validarLoteGuardado(lote);
    if (await this.obtenerActivo()) throw new Error('Ya existe un lote pendiente.');
    const cursor = await this.obtenerCursor();
    if (lote.desdeSecuencia !== cursor.hastaSecuencia + 1) {
      throw new Error('El lote no comienza después del cursor local.');
    }
    await escribirAtomico(this.raiz, 'activo.json', lote);
  }

  async obtenerConfirmado(id) {
    if (typeof id !== 'string'
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new TypeError('El identificador del lote no es válido.');
    }
    return leerOpcional(join(this.raiz, 'confirmados', `${id}.json`));
  }

  async confirmar(lote, respuesta) {
    validarLoteGuardado(lote);
    if (respuesta?.confirmado !== true || respuesta.id !== lote.id
        || (respuesta.resultados !== undefined && !Array.isArray(respuesta.resultados))) {
      throw new Error('La nube no confirmó el lote completo.');
    }
    const actual = await this.obtenerActivo();
    if (!actual || actual.id !== lote.id || actual.hastaSecuencia !== lote.hastaSecuencia) {
      throw new Error('La confirmación no corresponde al lote pendiente.');
    }
    await escribirAtomico(join(this.raiz, 'confirmados'), `${lote.id}.json`, {
      id: lote.id,
      contexto: lote.contexto,
      desdeSecuencia: lote.desdeSecuencia,
      hastaSecuencia: lote.hastaSecuencia,
      fechaConfirmacionUtc: new Date().toISOString(),
      respuesta,
    });
    await escribirAtomico(this.raiz, 'cursor.json', {
      hastaSecuencia: lote.hastaSecuencia,
      ultimoLoteId: lote.id,
    });
    // El cursor confirmado permite reconocer el éxito incluso si el proceso
    // se detiene antes de retirar el archivo activo.
    await unlink(join(this.raiz, 'activo.json')).catch(error => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}

function validarLoteGuardado(lote) {
  if (!lote || typeof lote.id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lote.id)
      || !Number.isSafeInteger(lote.desdeSecuencia) || lote.desdeSecuencia < 1
      || !Number.isSafeInteger(lote.hastaSecuencia) || lote.hastaSecuencia < lote.desdeSecuencia
      || !Array.isArray(lote.operaciones) || lote.operaciones.length === 0
      || lote.operaciones.length !== lote.hastaSecuencia - lote.desdeSecuencia + 1
      || !lote.operaciones.every((operacion, indice) => operacion.secuencia === lote.desdeSecuencia + indice)) {
    throw new Error('El lote local no es válido.');
  }
  validarContextoCaja(lote.contexto);
}

async function leerOpcional(ruta) {
  try {
    return JSON.parse(await readFile(ruta, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function escribirAtomico(directorio, nombre, contenido) {
  const datos = JSON.stringify(JSON.parse(serializarJsonLocal(contenido)), null, 2) + '\n';
  await mkdir(directorio, { recursive: true });
  const temporal = join(directorio, `.${randomUUID()}.tmp`);
  let archivo;
  try {
    archivo = await open(temporal, 'wx');
    await archivo.writeFile(datos, 'utf8');
    await archivo.sync();
    await archivo.close();
    archivo = undefined;
    await rename(temporal, join(directorio, nombre));
  } finally {
    if (archivo) await archivo.close();
    await unlink(temporal).catch(error => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}
