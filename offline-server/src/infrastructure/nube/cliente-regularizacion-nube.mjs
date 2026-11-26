import { serializarJsonLocal } from '../../application/validators/serializar-json-local.mjs';
import { solicitarApiNube } from './solicitar-api-nube.mjs';

/** Envía un lote completo; nunca decide si debe descartarse la copia local. */
export class ClienteRegularizacionNube {
  constructor({ url, obtenerToken, fetchImpl = globalThis.fetch, tiempoLimiteMs = 30_000 }) {
    let destino;
    try {
      destino = new URL(url);
    } catch {
      throw new TypeError('La dirección de regularización no es válida.');
    }
    if (destino.protocol !== 'https:' || destino.username || destino.password || destino.hash) {
      throw new TypeError('La dirección de regularización debe ser HTTPS y no contener credenciales.');
    }
    if (typeof obtenerToken !== 'function' || typeof fetchImpl !== 'function'
        || !Number.isSafeInteger(tiempoLimiteMs) || tiempoLimiteMs <= 0) {
      throw new TypeError('La configuración de regularización no es válida.');
    }
    this.url = destino.href;
    this.obtenerToken = obtenerToken;
    this.fetch = fetchImpl;
    this.tiempoLimiteMs = tiempoLimiteMs;
  }

  async regularizar(lote) {
    const token = await this.obtenerToken();
    if (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) {
      throw new Error('No hay una sesión válida para regularizar el lote.');
    }
    const respuesta = await solicitarApiNube(this.fetch, this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: serializarJsonLocal(lote),
      redirect: 'error',
      signal: AbortSignal.timeout(this.tiempoLimiteMs),
    }, 'regularizar el lote');
    let confirmacion;
    try {
      confirmacion = await respuesta.json();
    } catch {
      throw new Error('El servidor devolvió una confirmación de regularización no válida.');
    }
    if (confirmacion?.confirmado !== true || confirmacion.id !== lote?.id) {
      throw new Error('El servidor no confirmó el lote completo.');
    }
    if (confirmacion.resultados !== undefined && !Array.isArray(confirmacion.resultados)) {
      throw new Error('El servidor devolvió resultados de regularización no válidos.');
    }
    return { confirmado: true, id: confirmacion.id,
      ...(confirmacion.resultados === undefined ? {} : { resultados: confirmacion.resultados }) };
  }
}
