import { link, mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validarTransaccionLocal } from '../../application/validators/validar-transaccion-local.mjs';
import { validarArchivoLocal } from '../../application/validators/validar-archivo-local.mjs';
import { serializarJsonLocal } from '../../application/validators/serializar-json-local.mjs';

/** El diario es la fuente de recuperación; los JSON por pedido son sus vistas. */
export class DiarioTransaccionalLocal {
  constructor(directorioRaiz) {
    if (typeof directorioRaiz !== 'string' || !directorioRaiz.trim()) {
      throw new TypeError('El directorio de datos es obligatorio.');
    }
    this.raiz = resolve(directorioRaiz);
    this.cola = Promise.resolve();
    this.estado = null;
  }

  iniciar() {
    return this.encolar(async () => this.cargarYRecuperar());
  }

  obtenerUltimaSecuencia() {
    return this.encolar(async () => {
      await this.asegurarIniciado();
      return this.estado.secuencia;
    });
  }

  /** Publica una copia mientras el cursor confirmado sigue cubriendo todo el diario. */
  ejecutarConSecuenciaConfirmada(secuencia, trabajo) {
    if (typeof trabajo !== 'function') throw new TypeError('La operación no es válida.');
    return this.encolar(async () => {
      await this.asegurarIniciado();
      if (this.estado.secuencia !== secuencia) {
        throw new Error('La copia no puede actualizarse mientras existan operaciones en el diario sin confirmar.');
      }
      return trabajo();
    });
  }

  aplicar(transaccion, comprobarAntesDeGuardar = null, hastaSecuencia = 0) {
    validarTransaccionLocal(transaccion);
    const copia = JSON.parse(serializarJsonLocal(transaccion));
    validarTransaccionLocal(copia);
    return this.encolar(async () => {
      await this.asegurarIniciado();
      const existente = this.estado.transacciones.get(copia.id.toLowerCase());
      if (existente) {
        if (JSON.stringify(existente.cambios) !== JSON.stringify(copia.cambios)
            || JSON.stringify(existente.operacion) !== JSON.stringify(copia.operacion)) {
          throw new Error('El identificador de transacción ya contiene otros datos.');
        }
        // Reproyectar el estado actual; un reintento antiguo no debe revertir cambios posteriores.
        const actuales = existente.cambios.map(cambio =>
          this.estado.documentos.get(`${cambio.tipo}/${cambio.identificador.toLowerCase()}`));
        await this.proyectar(actuales);
        return 'existente';
      }
      if (comprobarAntesDeGuardar !== null) {
        if (typeof comprobarAntesDeGuardar !== 'function') throw new TypeError('La comprobación no es válida.');
        await comprobarAntesDeGuardar();
      }
      for (const cambio of copia.cambios) {
        const previo = this.estado.documentos.get(`${cambio.tipo}/${cambio.identificador.toLowerCase()}`);
        if (previo && previo.identificador !== cambio.identificador) {
          throw new Error('El identificador debe conservar sus mayúsculas y minúsculas.');
        }
        const ultima = this.estado.versiones.get(`${cambio.tipo}/${cambio.identificador.toLowerCase()}`) ?? 0;
        const versionActual = ultima > hastaSecuencia ? ultima : 0;
        if (cambio.versionEsperada !== undefined && cambio.versionEsperada !== versionActual) {
          throw new Error('El registro local ha cambiado; actualice los datos antes de continuar.');
        }
      }
      const registro = {
        id: copia.id,
        secuencia: this.estado.secuencia + 1,
        fechaUtc: new Date().toISOString(),
        cambios: copia.cambios,
        ...(copia.operacion === undefined ? {} : { operacion: copia.operacion }),
      };
      const directorio = join(this.raiz, 'transacciones');
      await mkdir(directorio, { recursive: true });
      const nombre = `${String(registro.secuencia).padStart(16, '0')}-${randomUUID()}.json`;
      await publicarArchivoNuevo(directorio, nombre, registro);

      // Después de publicar el diario, un reintento con el mismo ID es idempotente.
      this.aplicarEnMemoria(registro);
      await this.proyectar(registro.cambios);
      return 'registrada';
    });
  }

  async obtener(tipo, identificador, hastaSecuencia = 0) {
    return (await this.obtenerConVersion(tipo, identificador, hastaSecuencia)).contenido;
  }

  obtenerConVersion(tipo, identificador, hastaSecuencia = 0) {
    validarArchivoLocal(tipo, identificador, {});
    return this.encolar(async () => {
      await this.asegurarIniciado();
      const clave = `${tipo}/${identificador.toLowerCase()}`;
      const documento = this.estado.documentos.get(clave);
      const version = this.estado.versiones.get(clave) ?? 0;
      if (version <= hastaSecuencia) return { contenido: null, version: 0 };
      return {
        contenido: documento ? structuredClone(documento.contenido) : null,
        version,
      };
    });
  }

  listar(tipo, hastaSecuencia = 0) {
    validarArchivoLocal(tipo, 'validacion', {});
    return this.encolar(async () => {
      await this.asegurarIniciado();
      return [...this.estado.documentos.entries()]
        .filter(([clave]) => clave.startsWith(`${tipo}/`) && this.estado.versiones.get(clave) > hastaSecuencia)
        .map(([clave, documento]) => ({
          identificador: documento.identificador,
          contenido: structuredClone(documento.contenido),
          version: this.estado.versiones.get(clave),
        }));
    });
  }

  listarDesde(secuencia, { soloReferencias = false } = {}) {
    if (!Number.isSafeInteger(secuencia) || secuencia < 0) {
      throw new TypeError('La secuencia no es válida.');
    }
    return this.encolar(async () => {
      await this.asegurarIniciado();
      if (secuencia > this.estado.secuencia) {
        throw new Error('La secuencia confirmada supera el diario local.');
      }
      return [...this.estado.transacciones.values()]
        .filter(transaccion => transaccion.secuencia > secuencia)
        .map(transaccion => {
          if (!soloReferencias) return structuredClone(transaccion);
          // Las copias del pedido, de la mesa y del plan de impresión solo se recuperan en caja.
          const { cambios, ...operacion } = transaccion;
          return { ...structuredClone(operacion), cambios: cambios.map(({ tipo, identificador }) => ({ tipo, identificador })) };
        });
    });
  }

  obtenerTransaccion(id) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)) {
      throw new TypeError('El identificador de transacción no es válido.');
    }
    return this.encolar(async () => {
      await this.asegurarIniciado();
      const registro = this.estado.transacciones.get(id.toLowerCase());
      return registro ? structuredClone(registro) : null;
    });
  }

  encolar(trabajo) {
    const resultado = this.cola.then(trabajo);
    this.cola = resultado.catch(() => undefined);
    return resultado;
  }

  async asegurarIniciado() {
    if (!this.estado) await this.cargarYRecuperar();
  }

  async cargarYRecuperar() {
    const directorio = join(this.raiz, 'transacciones');
    await mkdir(directorio, { recursive: true });
    const archivos = (await readdir(directorio))
      .filter(nombre => /^\d{16}-[0-9a-f-]{36}\.json$/.test(nombre))
      .sort();
    this.estado = { secuencia: 0, transacciones: new Map(), documentos: new Map(), versiones: new Map() };
    try {
      for (const nombre of archivos) {
        const registro = JSON.parse(await readFile(join(directorio, nombre), 'utf8'));
        validarTransaccionLocal(registro);
        if (registro.secuencia !== this.estado.secuencia + 1
            || !nombre.startsWith(`${String(registro.secuencia).padStart(16, '0')}-`)
            || this.estado.transacciones.has(registro.id.toLowerCase())) {
          throw new Error('El diario local contiene transacciones incoherentes.');
        }
        this.aplicarEnMemoria(registro);
      }
      await this.proyectar([...this.estado.documentos.values()]);
    } catch (error) {
      this.estado = null;
      throw error;
    }
  }

  aplicarEnMemoria(registro) {
    this.estado.secuencia = registro.secuencia;
    this.estado.transacciones.set(registro.id.toLowerCase(), registro);
    for (const cambio of registro.cambios) {
      const clave = `${cambio.tipo}/${cambio.identificador.toLowerCase()}`;
      this.estado.documentos.set(clave, cambio);
      this.estado.versiones.set(clave, registro.secuencia);
    }
  }

  async proyectar(cambios) {
    for (const cambio of cambios) {
      const directorio = join(this.raiz, cambio.tipo);
      await mkdir(directorio, { recursive: true });
      const temporal = join(directorio, `.${randomUUID()}.tmp`);
      try {
        await escribirCompleto(temporal, cambio.contenido);
        await rename(temporal, join(directorio, `${cambio.identificador}.json`));
      } finally {
        await unlink(temporal).catch(error => {
          if (error?.code !== 'ENOENT') throw error;
        });
      }
    }
  }
}

async function publicarArchivoNuevo(directorio, nombre, datos) {
  const temporal = join(directorio, `.${randomUUID()}.tmp`);
  try {
    await escribirCompleto(temporal, datos);
    await link(temporal, join(directorio, nombre));
  } finally {
    await unlink(temporal).catch(error => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}

async function escribirCompleto(ruta, datos) {
  const archivo = await open(ruta, 'wx');
  try {
    await archivo.writeFile(JSON.stringify(datos, null, 2) + '\n', 'utf8');
    await archivo.sync();
  } finally {
    await archivo.close();
  }
}
