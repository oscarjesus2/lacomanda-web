import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerConfiguracionCaja } from '../src/application/validators/validar-configuracion-caja.mjs';

// Los valores procedentes del navegador solo se usan como datos.
export function completarEntorno(config, env, directorioInstalacion, opcionesLocales = {}) {
  for (const campo of ['tenantId', 'identificadorEstacion', 'apiUrl', 'origen']) {
    if (typeof config?.[campo] !== 'string' || !config[campo].trim() || /[\u0000-\u001f]/.test(config[campo])) {
      throw new Error('La configuración de la estación está incompleta.');
    }
  }
  if (config.origen.includes(',')) throw new Error('La configuración debe indicar un único origen de la aplicación.');
  const locales = { ...env };
  for (const nombre of ['DATA_DIR', 'HOST', 'PORT', 'TLS_CERT', 'TLS_KEY', 'TLS_PORT', 'ORIGINS']) {
    const clave = 'LACOMANDA_OFFLINE_' + nombre;
    if (typeof opcionesLocales[clave] === 'string' && opcionesLocales[clave]) locales[clave] = opcionesLocales[clave];
  }
  const origenes = new Set([config.origen, ...(locales.LACOMANDA_OFFLINE_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)]);
  const opciones = {
    ...locales,
    LACOMANDA_OFFLINE_TENANT: config.tenantId,
    LACOMANDA_OFFLINE_ESTACION: config.identificadorEstacion,
    LACOMANDA_OFFLINE_API_URL: config.apiUrl,
    LACOMANDA_OFFLINE_ORIGINS: [...origenes].join(','),
    LACOMANDA_OFFLINE_ENABLED: 'true',
    LACOMANDA_OFFLINE_DATA_DIR: locales.LACOMANDA_OFFLINE_DATA_DIR || join(directorioInstalacion, 'datos'),
  };
  // Reutiliza las mismas reglas que aplica el servidor al abrir los listeners.
  leerConfiguracionCaja(opciones);
  return opciones;
}

async function iniciar() {
  const validar = process.argv[2] === '--validar';
  const directorio = join(process.env.LOCALAPPDATA, 'LaComanda', 'Caja');
  const archivo = validar ? process.argv[3] : join(directorio, 'configuracion.json');
  try {
    const config = JSON.parse((await readFile(archivo, 'utf8')).replace(/^\uFEFF/, ''));
    const env = completarEntorno(config, process.env, directorio, validar ? {} : config.opcionesLocales);
    if (validar) return;
    for (const [clave, valor] of Object.entries(env)) {
      if (clave.startsWith('LACOMANDA_OFFLINE_')) process.env[clave] = valor;
    }
    await import('../src/main.mjs');
    // Solo después de que el servidor confirme que escucha en su puerto.
    await writeFile(join(dirname(archivo), 'proceso.txt'), String(process.pid));
  } catch (error) {
    if (!validar) {
      // Los errores de arranque se conservan aunque no haya una consola abierta.
      await appendFile(join(directorio, 'arranque.log'), `${new Date().toISOString()} ${error.message}\n`).catch(() => {});
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await iniciar();
