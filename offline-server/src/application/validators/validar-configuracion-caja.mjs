import { validarContextoCaja } from './validar-contexto-caja.mjs';
import { validarDirectorioCaja } from './validar-directorio-caja.mjs';

export function leerConfiguracionCaja(env) {
  const directorio = env.LACOMANDA_OFFLINE_DATA_DIR;
  validarDirectorioCaja(directorio);
  const contexto = validarContextoCaja({
    tenantId: env.LACOMANDA_OFFLINE_TENANT,
    identificadorEstacion: env.LACOMANDA_OFFLINE_ESTACION,
  });
  const api = new URL(env.LACOMANDA_OFFLINE_API_URL);
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) {
    throw new TypeError('La URL de la API debe usar HTTPS y no contener credenciales, consulta ni fragmento.');
  }
  if (contexto.identificadorEstacion.length > 100 || /[/\\?#]/.test(contexto.identificadorEstacion)
      || ['.', '..'].includes(contexto.identificadorEstacion)) {
    throw new TypeError('El identificador de estación no es válido.');
  }
  const origenesPermitidos = (env.LACOMANDA_OFFLINE_ORIGINS ?? '').split(',')
    .map(origen => origen.trim()).filter(Boolean);
  if (!origenesPermitidos.length || origenesPermitidos.some(origen => {
    const url = new URL(origen);
    return url.origin !== origen || url.hostname.includes('*') || !(
      url.protocol === 'https:' || (url.protocol === 'http:' && esHostDeCaja(url.hostname)));
  })) throw new TypeError('Configure los orígenes exactos de la aplicación de la sucursal.');

  const habilitado = env.LACOMANDA_OFFLINE_ENABLED ?? 'false';
  if (!['true', 'false'].includes(habilitado)) throw new TypeError('LACOMANDA_OFFLINE_ENABLED debe ser true o false.');
  const host = env.LACOMANDA_OFFLINE_HOST ?? '127.0.0.1';
  const cert = env.LACOMANDA_OFFLINE_TLS_CERT;
  const key = env.LACOMANDA_OFFLINE_TLS_KEY;
  const lan = !esHostDeCaja(host) || cert || key;
  if (lan && (!cert || !key)) throw new TypeError('El acceso por LAN requiere el certificado y la clave TLS de caja.');
  return {
    directorio, contexto, origenesPermitidos, habilitado: habilitado === 'true',
    puerto: leerPuerto(env.LACOMANDA_OFFLINE_PORT ?? 17861),
    hostLocal: esHostDeCaja(host) ? host : '127.0.0.1',
    lan: lan ? { host, puerto: leerPuerto(env.LACOMANDA_OFFLINE_TLS_PORT ?? 17862), cert, key } : null,
    urlInstantanea: api.href.replace(/\/$/, '') + '/offline/instantanea/' + encodeURIComponent(contexto.identificadorEstacion),
    urlLotes: api.href.replace(/\/$/, '') + '/offline/lotes',
  };
}

export function esHostDeCaja(host) {
  return ['127.0.0.1', 'localhost', '[::1]', '::1', '::ffff:127.0.0.1'].includes(host);
}

function leerPuerto(valor) {
  const puerto = Number(valor);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new TypeError('El puerto de caja no es válido.');
  return puerto;
}
