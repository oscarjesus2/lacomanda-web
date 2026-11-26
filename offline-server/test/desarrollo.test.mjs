import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configurarDesarrollo } from '../desarrollo.mjs';
import { leerConfiguracionCaja } from '../src/application/validators/validar-configuracion-caja.mjs';
import { prepararCajaLocal } from '../src/preparar-caja-local.mjs';
import { crearServidorLocal } from '../src/interfaces/http/crear-servidor-local.mjs';
import { clienteHttpDePrueba } from '../test-support/http-en-memoria.mjs';

test('Comprobar conexión desde Angular alcanza la caja nueva antes de sincronizar la sucursal', async t => {
  const directorio = await mkdtemp(join(tmpdir(), 'lacomanda-desarrollo-'));
  t.after(() => rm(directorio, { force: true, recursive: true }));
  const env = { LACOMANDA_OFFLINE_DATA_DIR: directorio };
  await configurarDesarrollo(env, ['sucursal-prueba', 'caja-prueba']);
  const config = leerConfiguracionCaja(env);
  assert.equal(config.hostLocal, '127.0.0.1');
  assert.equal(config.puerto, 17861);
  assert.equal(config.urlInstantanea, 'https://localhost:7285/api/offline/instantanea/caja-prueba');

  const cliente = clienteHttpDePrueba(crearServidorLocal(await prepararCajaLocal(config)));
  const url = 'http://127.0.0.1:17861/api/estado';
  for (const origen of ['http://localhost:4200', 'http://127.0.0.1:4200']) {
    const respuesta = await cliente(url, { headers: { Origin: origen } });
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get('access-control-allow-origin'), origen);
    const estado = await respuesta.json();
    assert.equal(estado.disponible, false);
    assert.match(estado.mensaje, /Sincronice la caja/);
  }
  const origenAjeno = await cliente(url, { headers: { Origin: 'http://localhost:4300' } });
  assert.equal(origenAjeno.status, 403);
});
