import { mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validarNumeroPedidoOffline } from '../../application/validators/validar-numero-pedido-offline.mjs';
import { serializarJsonLocal } from '../../application/validators/serializar-json-local.mjs';

/** Conserva el estado de impresión fuera del diario que se envía a la nube. */
export class RepositorioProgresoImpresion {
  constructor(directorio) {
    if (typeof directorio !== 'string' || !directorio.trim()) throw new TypeError('Falta el directorio de caja.');
    this.directorio = join(resolve(directorio), 'progreso-impresiones');
    this.cola = Promise.resolve();
  }

  ejecutarExclusivo(idPedido, trabajo) {
    validarNumeroPedidoOffline(1, idPedido);
    const resultado = this.cola.then(async () => {
      const ruta = join(this.directorio, `${idPedido.toLowerCase()}.json`);
      let actual = null;
      try {
        actual = JSON.parse(await readFile(ruta, 'utf8'));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      const { guardar, respuesta } = await trabajo(actual);
      if (guardar) {
        const datos = serializarJsonLocal(guardar);
        await mkdir(this.directorio, { recursive: true });
        const temporal = join(this.directorio, `.${randomUUID()}.tmp`);
        let archivo;
        try {
          archivo = await open(temporal, 'wx');
          await archivo.writeFile(datos, 'utf8');
          await archivo.sync();
          await archivo.close();
          archivo = null;
          await rename(temporal, ruta);
        } finally {
          if (archivo) await archivo.close();
          await unlink(temporal).catch(error => { if (error?.code !== 'ENOENT') throw error; });
        }
      }
      return structuredClone(respuesta);
    });
    this.cola = resultado.catch(() => undefined);
    return resultado;
  }

  listar() {
    const resultado = this.cola.then(async () => {
      let archivos;
      try {
        archivos = await readdir(this.directorio);
      } catch (error) {
        if (error?.code === 'ENOENT') return [];
        throw error;
      }
      const planes = [];
      for (const nombre of archivos.filter(item => /^[0-9a-f-]{36}\.json$/.test(item)).sort()) {
        const progreso = JSON.parse(await readFile(join(this.directorio, nombre), 'utf8'));
        validarNumeroPedidoOffline(1, progreso?.plan?.idOperacionPedido);
        if (`${progreso.plan.idOperacionPedido.toLowerCase()}.json` !== nombre
            || !Array.isArray(progreso.estados) || !Array.isArray(progreso.plan.trabajos)
            || progreso.estados.length !== progreso.plan.trabajos.length) {
          throw new Error('El progreso de impresión guardado no es válido.');
        }
        planes.push(progreso);
      }
      return planes;
    });
    this.cola = resultado.catch(() => undefined);
    return resultado;
  }
}
