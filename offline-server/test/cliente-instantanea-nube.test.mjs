import test from 'node:test';
import assert from 'node:assert/strict';
import { ClienteInstantaneaNube } from '../src/infrastructure/nube/cliente-instantanea-nube.mjs';

test('solicita la versión a la nube con la sesión y conserva la respuesta completa', async () => {
  let llamada;
  const cliente = new ClienteInstantaneaNube({ url: 'https://api.example/offline/copia', obtenerToken: async () => 'token',
    fetchImpl: async (url, opciones) => { llamada = { url, opciones }; return { ok: true,
      json: async () => ({ version: 3, maestros: { productos: [], mesas: [] } }) }; } });
  assert.deepEqual(await cliente.obtenerInstantanea({ desdeVersion: 2 }), { version: 3, maestros: { productos: [], mesas: [] } });
  assert.equal(llamada.url, 'https://api.example/offline/copia?desdeVersion=2');
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer token');
  assert.equal(llamada.opciones.redirect, 'error');
});

test('rechaza errores, versiones anteriores y respuestas incompletas', async () => {
  for (const respuesta of [{ ok: false, status: 500 }, { ok: true, json: async () => ({ version: 1, maestros: {} }) },
    { ok: true, json: async () => ({ version: 3 }) }, { ok: true, json: async () => { throw new Error(); } }]) {
    const cliente = new ClienteInstantaneaNube({ url: 'https://api.example/offline', obtenerToken: async () => 'token',
      fetchImpl: async () => respuesta });
    await assert.rejects(cliente.obtenerInstantanea({ desdeVersion: 2 }));
  }
});

test('admite la misma versión sin volver a descargar maestros', async () => {
  const cliente = new ClienteInstantaneaNube({ url: 'https://api.example/offline', obtenerToken: async () => 'token',
    fetchImpl: async () => ({ ok: true, json: async () => ({ version: 2 }) }) });
  assert.deepEqual(await cliente.obtenerInstantanea({ desdeVersion: 2 }), { version: 2 });
});

test('rechaza direcciones inseguras y sesiones inválidas antes de enviar', async () => {
  assert.throws(() => new ClienteInstantaneaNube({ url: 'http://api.example', obtenerToken: async () => 'x' }), /configuración/);
  let enviadas = 0;
  const cliente = new ClienteInstantaneaNube({ url: 'https://api.example/offline', obtenerToken: async () => '',
    fetchImpl: async () => { enviadas++; } });
  await assert.rejects(cliente.obtenerInstantanea({ desdeVersion: null }), /sesión/);
  assert.equal(enviadas, 0);
});
