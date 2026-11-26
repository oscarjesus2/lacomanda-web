import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';
import { SincronizarMaestrosLocales } from '../src/application/use-cases/sincronizar-maestros-locales.mjs';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { ClienteInstantaneaNube } from '../src/infrastructure/nube/cliente-instantanea-nube.mjs';

const diarioVacio = { ejecutarConSecuenciaConfirmada: async (_secuencia, trabajo) => trabajo() };

test('una fecha de consulta más reciente no invalida datos idénticos de la misma generación', async () => {
  await conRepositorio(async (repositorio, diario) => {
    const maestros = { productos: [{ id: 1 }], mesas: [] };
    await repositorio.guardar(1, maestros);
    const caso = new SincronizarMaestrosLocales({ obtenerInstantanea: async () => ({ version: 2, maestros }) }, repositorio, diario);
    assert.deepEqual(await caso.ejecutar(), { actualizada: false, version: 1 });
    assert.equal((await repositorio.obtener()).version, 1);
  });
});

async function conRepositorio(prueba) {
  const raiz = resolve(tmpdir());
  const directorio = await mkdtemp(join(raiz, 'lacomanda-sync-test-'));
  try {
    await prueba(new RepositorioMaestrosLocales(directorio), new DiarioTransaccionalLocal(directorio));
  } finally {
    if (!resolve(directorio).startsWith(raiz + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

test('solo confirma una instantánea completa y conserva la versión al consultar de nuevo', async () => {
  await conRepositorio(async repositorio => {
    const solicitudes = [];
    const fuente = { obtenerInstantanea: async solicitud => {
      solicitudes.push(solicitud);
      return { version: 4, maestros: { productos: [{ id: 1 }], mesas: [{ id: 5 }] } };
    } };
    const caso = new SincronizarMaestrosLocales(fuente, repositorio, diarioVacio);
    assert.deepEqual(await caso.ejecutar(), { actualizada: true, version: 4 });
    assert.deepEqual(await caso.ejecutar(), { actualizada: false, version: 4 });
    assert.deepEqual(solicitudes, [{ desdeVersion: null }, { desdeVersion: 4 }]);
  });
});

test('una respuesta incompleta o sin conexión conserva los maestros anteriores', async () => {
  await conRepositorio(async repositorio => {
    await repositorio.guardar(4, { productos: [], mesas: [] });
    const incompleta = new SincronizarMaestrosLocales({ obtenerInstantanea: async () => ({
      version: 5, maestros: { productos: [] },
    }) }, repositorio, diarioVacio);
    await assert.rejects(incompleta.ejecutar(), /productos y mesas/);
    const desconectada = new SincronizarMaestrosLocales({ obtenerInstantanea: async () => {
      throw new Error('Sin conexión');
    } }, repositorio, diarioVacio);
    await assert.rejects(desconectada.ejecutar(), /Sin conexión/);
    assert.equal((await repositorio.obtener()).version, 4);
  });
});

test('conserva la copia si existe actividad local o aparece durante la consulta', async () => {
  await conRepositorio(async (repositorio, diario) => {
    await repositorio.guardar(4, { productos: [], mesas: [] });
    const fuente = { obtenerInstantanea: async () => {
      await diario.aplicar({ id: 'pedido', cambios: [{ tipo: 'pedidos', identificador: 'uno', contenido: {} }] });
      return { version: 5, maestros: { productos: [], mesas: [] } };
    } };
    const cambiante = new SincronizarMaestrosLocales(fuente, repositorio, diario);
    await assert.rejects(cambiante.ejecutar(), /operaciones en el diario/);
    await assert.rejects(new SincronizarMaestrosLocales(fuente, repositorio).ejecutar(), /comprobar el diario/);
    assert.equal((await repositorio.obtener()).version, 4);
  });
});

test('serializa la publicación de maestros y la escritura del diario', async () => {
  await conRepositorio(async (repositorio, diario) => {
    let publicar;
    let avisar;
    const espera = new Promise(resolve => publicar = resolve);
    const empezada = new Promise(resolve => avisar = resolve);
    const original = repositorio.guardar.bind(repositorio);
    repositorio.guardar = async (...args) => { avisar(); await espera; return original(...args); };
    const caso = new SincronizarMaestrosLocales({ obtenerInstantanea: async () => ({
      version: 1, maestros: { productos: [], mesas: [] },
    }) }, repositorio, diario);
    const sincronizacion = caso.ejecutar();
    await empezada;
    let registrada = false;
    const escritura = diario.aplicar({ id: 'pedido', cambios: [{ tipo: 'pedidos', identificador: 'uno', contenido: {} }] })
      .then(() => registrada = true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(registrada, false);
    publicar();
    await sincronizacion;
    await escritura;
    assert.equal(registrada, true);
    assert.equal((await repositorio.obtener()).version, 1);
  });
});

test('obtiene la copia por el cliente de nube y la conserva si falla la siguiente consulta', async () => {
  await conRepositorio(async (repositorio, diario) => {
    let solicitudes = 0;
    const fuente = new ClienteInstantaneaNube({ url: 'https://api.example/offline/copia', obtenerToken: async () => 'sesion',
      fetchImpl: async (_url, opciones) => {
        assert.equal(opciones.headers.Authorization, 'Bearer sesion');
        if (++solicitudes === 2) throw new Error('Sin conexión');
        return { ok: true, json: async () => ({ version: 5, maestros: { productos: [{ id: 7 }], mesas: [] } }) };
      } });
    const caso = new SincronizarMaestrosLocales(fuente, repositorio, diario);
    assert.deepEqual(await caso.ejecutar(), { actualizada: true, version: 5 });
    await assert.rejects(caso.ejecutar(), error => error.codigoHttp === 502 && error.cause.message === 'Sin conexión');
    assert.deepEqual((await repositorio.obtener()).maestros.productos, [{ id: 7 }]);
  });
});
