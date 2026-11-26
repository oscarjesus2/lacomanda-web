import { mkdir, open, readFile, readdir, rename, rmdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validarMaestrosLocales } from '../../application/validators/validar-maestros-locales.mjs';
import { serializarJsonLocal } from '../../application/validators/serializar-json-local.mjs';

/** Conserva una versión completa de maestros en archivos locales de caja. */
export class RepositorioMaestrosLocales {
  constructor(directorioRaiz) {
    if (typeof directorioRaiz !== 'string' || !directorioRaiz.trim()) {
      throw new TypeError('El directorio de datos es obligatorio.');
    }
    this.directorioRaiz = resolve(directorioRaiz);
    this.cola = Promise.resolve();
    this.copiaLeida = null;
  }

  guardar(version, maestros, hastaSecuencia = 0) {
    validarMaestrosLocales(version, maestros);
    if (!Number.isSafeInteger(hastaSecuencia) || hastaSecuencia < 0) throw new TypeError('La secuencia no es válida.');
    // Congelar los datos antes de esperar: el llamante no puede modificarlos a mitad de escritura.
    const copia = JSON.parse(serializarJsonLocal(maestros));
    return this.encolar(() => this.guardarVersion(version, copia, hastaSecuencia));
  }

  encolar(accion) {
    const trabajo = this.cola.then(accion);
    this.cola = trabajo.catch(() => undefined);
    return trabajo;
  }

  obtener() {
    return this.encolar(() => this.leerActual());
  }

  async leerActual() {
    let indice;
    try {
      indice = JSON.parse(await readFile(join(this.directorioRaiz, 'maestros', 'actual.json'), 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
    if (!Number.isSafeInteger(indice.version)
        || (indice.hastaSecuencia !== undefined && (!Number.isSafeInteger(indice.hastaSecuencia) || indice.hastaSecuencia < 0))
        || typeof indice.directorio !== 'string'
        || !/^[0-9a-f-]{36}$/.test(indice.directorio)
        || !Array.isArray(indice.nombres)
        || !indice.nombres.every(nombre => typeof nombre === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(nombre))) {
      throw new Error('El índice local de maestros no es válido.');
    }
    if (this.copiaLeida?.directorio === indice.directorio && this.copiaLeida.estado.version === indice.version
        && (this.copiaLeida.estado.hastaSecuencia ?? 0) === (indice.hastaSecuencia ?? 0)) {
      return structuredClone(this.copiaLeida.estado);
    }
    const maestros = {};
    for (const nombre of indice.nombres) {
      const archivo = join(this.directorioRaiz, 'maestros', 'versiones', indice.directorio, `${nombre}.json`);
      maestros[nombre] = JSON.parse(await readFile(archivo, 'utf8'));
    }
    validarMaestrosLocales(indice.version, maestros);
    const estado = { version: indice.version, maestros, ...(indice.hastaSecuencia ? { hastaSecuencia: indice.hastaSecuencia } : {}) };
    this.copiaLeida = { directorio: indice.directorio, estado };
    return structuredClone(estado);
  }

  async guardarVersion(version, maestros, hastaSecuencia) {
    const anterior = await this.leerActual();
    if (anterior && version <= anterior.version) {
      throw new Error('La versión de maestros debe ser posterior a la actual.');
    }
    if (hastaSecuencia < (anterior?.hastaSecuencia ?? 0)) throw new Error('La secuencia de la copia no puede retroceder.');
    const raiz = join(this.directorioRaiz, 'maestros');
    const directorio = randomUUID();
    const rutaVersion = join(raiz, 'versiones', directorio);
    await mkdir(rutaVersion, { recursive: true });
    for (const nombre of Object.keys(maestros)) {
      await escribirArchivoCompleto(join(rutaVersion, `${nombre}.json`), maestros[nombre]);
    }

    const temporal = join(raiz, `.${randomUUID()}.tmp`);
    try {
      await escribirArchivoCompleto(temporal, {
        version,
        hastaSecuencia,
        directorio,
        nombres: Object.keys(maestros),
      });
      // El índice se publica solo después de escribir todos los maestros.
      await rename(temporal, join(raiz, 'actual.json'));
    } finally {
      await unlink(temporal).catch(error => {
        if (error?.code !== 'ENOENT') throw error;
      });
    }
    // La publicación ya es durable. Un bloqueo temporal en archivos viejos no invalida la copia nueva.
    await retirarVersionesAnteriores(join(raiz, 'versiones'), directorio).catch(error => {
      process.emitWarning('No se pudo limpiar una copia anterior de maestros: ' + (error.code ?? error.name));
    });
  }
}

// No toca entradas desconocidas. Una limpieza interrumpida se reanuda tras la siguiente publicación.
async function retirarVersionesAnteriores(versiones, vigente) {
  for (const carpeta of await readdir(versiones, { withFileTypes: true })) {
    if (!carpeta.isDirectory() || carpeta.name === vigente || !/^[0-9a-f-]{36}$/.test(carpeta.name)) continue;
    const ruta = join(versiones, carpeta.name);
    for (const archivo of await readdir(ruta, { withFileTypes: true })) {
      if (archivo.isFile() && /^[a-z][a-z0-9-]{0,63}\.json$/.test(archivo.name)) await unlink(join(ruta, archivo.name));
    }
    await rmdir(ruta).catch(error => { if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; });
  }
}

async function escribirArchivoCompleto(ruta, datos) {
  const archivo = await open(ruta, 'wx');
  try {
    await archivo.writeFile(JSON.stringify(datos, null, 2) + '\n', 'utf8');
    await archivo.sync();
  } finally {
    await archivo.close();
  }
}
