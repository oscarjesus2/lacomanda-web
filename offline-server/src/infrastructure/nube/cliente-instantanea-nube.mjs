import { comprobarContextoCaja } from '../../application/validators/validar-contexto-caja.mjs';
import { solicitarApiNube } from './solicitar-api-nube.mjs';

/** Obtiene una instantánea completa sin alterar la copia guardada en caja. */
export class ClienteInstantaneaNube {
  constructor({ url, obtenerToken, contexto, fetchImpl = globalThis.fetch, tiempoLimiteMs = 30_000 }) {
    let destino;
    try {
      destino = new URL(url);
    } catch {
      throw new TypeError('La dirección de sincronización no es válida.');
    }
    if (destino.protocol !== 'https:' || destino.username || destino.password || destino.hash || destino.search
        || typeof obtenerToken !== 'function' || typeof fetchImpl !== 'function'
        || !Number.isSafeInteger(tiempoLimiteMs) || tiempoLimiteMs <= 0) {
      throw new TypeError('La configuración de sincronización no es válida.');
    }
    this.url = destino.href;
    this.contexto = contexto;
    this.obtenerToken = obtenerToken;
    this.fetch = fetchImpl;
    this.tiempoLimiteMs = tiempoLimiteMs;
  }

  async obtenerInstantanea({ desdeVersion }) {
    if (desdeVersion !== null && (!Number.isSafeInteger(desdeVersion) || desdeVersion < 0)) {
      throw new TypeError('La versión local no es válida.');
    }
    const token = await this.obtenerToken();
    if (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) {
      throw new Error('No hay una sesión válida para sincronizar los maestros.');
    }
    const destino = new URL(this.url);
    if (desdeVersion !== null) destino.searchParams.set('desdeVersion', String(desdeVersion));
    const respuesta = await solicitarApiNube(this.fetch, destino.href, {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(this.tiempoLimiteMs),
    }, 'sincronizar los maestros');
    let instantanea;
    try {
      instantanea = await respuesta.json();
    } catch {
      throw new Error('La nube devolvió una copia que no es JSON válido.');
    }
    if (!instantanea || !Number.isSafeInteger(instantanea.version) || instantanea.version < 0
        || (desdeVersion !== null && instantanea.version < desdeVersion)
        || (instantanea.version !== desdeVersion
          && (!instantanea.maestros || typeof instantanea.maestros !== 'object' || Array.isArray(instantanea.maestros)))) {
      throw new Error('La nube devolvió una copia de maestros no válida.');
    }
    if (this.contexto && instantanea.maestros) {
      comprobarContextoCaja(instantanea.maestros.contexto, this.contexto);
      if (!Number.isSafeInteger(instantanea.maestros.contexto.idEstacion) || instantanea.maestros.contexto.idEstacion < 1
          || !Number.isSafeInteger(instantanea.maestros.contexto.idCaja) || instantanea.maestros.contexto.idCaja < 1) {
        throw new Error('La copia de nube no identifica la estación y su caja.');
      }
    }
    return instantanea;
  }
}
