import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { completarEntorno } from '../windows/iniciar.mjs';

const config = { tenantId: 'sucursal-1', identificadorEstacion: 'caja-01', apiUrl: 'https://nube.example/api', origen: 'https://app.example' };

test('el instalador configura la identidad descargada y conserva las opciones locales de disco y TLS', () => {
  const carpeta = join(tmpdir(), 'La Comanda', 'Caja');
  const personalizacion = {
    LACOMANDA_OFFLINE_DATA_DIR: join(carpeta, 'diario-existente'),
    LACOMANDA_OFFLINE_TLS_CERT: 'cert.pem',
    LACOMANDA_OFFLINE_TLS_KEY: 'key.pem',
    LACOMANDA_OFFLINE_HOST: '192.168.2.10',
  };
  const env = completarEntorno(config, personalizacion, carpeta);
  assert.equal(env.LACOMANDA_OFFLINE_TENANT, config.tenantId);
  assert.equal(env.LACOMANDA_OFFLINE_ESTACION, config.identificadorEstacion);
  assert.equal(env.LACOMANDA_OFFLINE_ORIGINS, config.origen);
  for (const [clave, valor] of Object.entries(personalizacion)) assert.equal(env[clave], valor);
  assert.equal(completarEntorno(config, {}, carpeta).LACOMANDA_OFFLINE_DATA_DIR, join(carpeta, 'datos'));
  const origenDev = { ...config, origen: 'http://localhost:4200', apiUrl: 'https://localhost:7285/api' };
  assert.equal(completarEntorno(origenDev, {}, carpeta).LACOMANDA_OFFLINE_API_URL, origenDev.apiUrl);
  const alReiniciar = completarEntorno(config, {}, carpeta, {
    ...personalizacion, LACOMANDA_OFFLINE_ORIGINS: 'https://lan.example', LACOMANDA_OFFLINE_API_URL: 'https://invalido.example',
  });
  assert.equal(alReiniciar.LACOMANDA_OFFLINE_API_URL, config.apiUrl);
  assert.equal(alReiniciar.LACOMANDA_OFFLINE_HOST, personalizacion.LACOMANDA_OFFLINE_HOST);
  assert.equal(alReiniciar.LACOMANDA_OFFLINE_DATA_DIR, personalizacion.LACOMANDA_OFFLINE_DATA_DIR);
  assert.equal(alReiniciar.LACOMANDA_OFFLINE_ORIGINS, 'https://app.example,https://lan.example');
});

test('el lanzador rechaza configuraciones incompletas, credenciales y orígenes múltiples', () => {
  for (const cambio of [{ tenantId: '' }, { identificadorEstacion: '' }, { tenantId: 'x\ny' },
    { origen: 'https://a.example,https://b.example' }, { apiUrl: 'https://nombre:clave@nube.example/api' }]) {
    assert.throws(() => completarEntorno({ ...config, ...cambio }, {}, tmpdir()));
  }
});

test('el proceso Windows de caja inicia bajo un perfil nuevo y vincula su diario a la estación', { timeout: 30000 }, async t => {
  const perfil = await mkdtemp(join(tmpdir(), 'la-comanda perfil '));
  const carpeta = join(perfil, 'LaComanda', 'Caja');
  t.after(() => rm(perfil, { recursive: true, force: true }));
  await mkdir(carpeta, { recursive: true });
  await writeFile(join(carpeta, 'configuracion.json'), '\uFEFF' + JSON.stringify(config));

  const puertoPrueba = createServer();
  puertoPrueba.listen(0, '127.0.0.1');
  await once(puertoPrueba, 'listening');
  const puerto = puertoPrueba.address().port;
  await new Promise(resolve => puertoPrueba.close(resolve));
  const env = Object.fromEntries(Object.entries(process.env).filter(([nombre]) => !nombre.startsWith('LACOMANDA_OFFLINE_')));
  const lanzador = fileURLToPath(new URL('../windows/iniciar.mjs', import.meta.url));
  const hijo = spawn(process.execPath, [lanzador], {
    env: { ...env, LOCALAPPDATA: perfil, LACOMANDA_OFFLINE_PORT: String(puerto) },
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let error = '';
  hijo.stderr.on('data', parte => { error += parte; });
  const salida = once(hijo, 'close');
  try {
    let pid = '';
    for (let i = 0; i < 180 && hijo.exitCode === null && !pid; i++) {
      try { pid = await readFile(join(carpeta, 'proceso.txt'), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (!pid) await esperar(100);
    }
    assert.equal(pid, String(hijo.pid), error || 'El proceso no confirmó el arranque.');
    assert.deepEqual(JSON.parse(await readFile(join(carpeta, 'datos', 'estado-local', 'contexto-caja.json'), 'utf8')), {
      tenantId: config.tenantId, identificadorEstacion: config.identificadorEstacion,
    });
  } finally {
    if (hijo.exitCode === null) hijo.kill();
    await salida;
  }
});
