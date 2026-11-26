import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { RepositorioArchivosLocales } from '../src/infrastructure/archivos/repositorio-archivos-locales.mjs';

async function conRepositorio(prueba) {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-offline-test-'));
  try {
    await prueba(new RepositorioArchivosLocales(directorio), directorio);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

test('guarda pedidos y comprobantes en archivos independientes y los recupera', async () => {
  await conRepositorio(async repositorio => {
    const pedido = { numero: 'OFF-CAJA01-001', mesa: 5 };
    const comprobante = { pedido: pedido.numero, tipo: 'boleta', pendiente: true };
    assert.equal(await repositorio.crear('pedidos', pedido.numero, pedido), 'creado');
    assert.equal(await repositorio.crear('comprobantes-pendientes', pedido.numero, comprobante), 'creado');
    assert.deepEqual(await repositorio.obtener('pedidos', pedido.numero), pedido);
    assert.deepEqual(await repositorio.obtener('comprobantes-pendientes', pedido.numero), comprobante);
  });
});

test('reintentar el mismo registro no duplica ni reemplaza datos', async () => {
  await conRepositorio(async (repositorio, directorio) => {
    const pedido = { numero: 'OFF-CAJA01-001', mesa: 5 };
    assert.equal(await repositorio.crear('pedidos', pedido.numero, pedido), 'creado');
    assert.equal(await repositorio.crear('pedidos', pedido.numero, pedido), 'existente');
    await assert.rejects(repositorio.crear('pedidos', pedido.numero, { mesa: 9 }), /archivo distinto/);
    assert.deepEqual(await repositorio.obtener('pedidos', pedido.numero), pedido);
    assert.deepEqual(await readdir(join(directorio, 'pedidos')), ['OFF-CAJA01-001.json']);
  });
});

test('las escrituras simultáneas no sobrescriben un pedido con el mismo identificador', async () => {
  await conRepositorio(async repositorio => {
    const resultados = await Promise.allSettled([
      repositorio.crear('pedidos', 'OFF-CAJA01-002', { mesa: 1 }),
      repositorio.crear('pedidos', 'OFF-CAJA01-002', { mesa: 2 }),
    ]);
    assert.equal(resultados.filter(resultado => resultado.status === 'fulfilled').length, 1);
    assert.equal(resultados.filter(resultado => resultado.status === 'rejected').length, 1);
    assert.ok([1, 2].includes((await repositorio.obtener('pedidos', 'OFF-CAJA01-002')).mesa));
  });
});

test('rechaza rutas y nombres no válidos antes de escribir', async () => {
  await conRepositorio(async repositorio => {
    await assert.rejects(repositorio.crear('pedidos', '../fuera', {}), /identificador/);
    await assert.rejects(repositorio.crear('pedidos', 'CON', {}), /identificador/);
    await assert.rejects(repositorio.crear('../pedidos', '001', {}), /tipo/);
    await assert.rejects(repositorio.crear('pedidos', '001', null), /contenido/);
  });
});

test('no guarda importes inválidos ni descarta valores indefinidos', async () => {
  await conRepositorio(async (repositorio, directorio) => {
    await assert.rejects(repositorio.crear('pedidos', '001', { total: Number.NaN }), /valor/);
    await assert.rejects(repositorio.crear('pedidos', '002', { total: undefined }), /valor/);
    assert.deepEqual(await readdir(directorio), []);
  });
});
