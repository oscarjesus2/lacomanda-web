import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';

async function conRepositorio(prueba) {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-maestros-test-'));
  try {
    await prueba(new RepositorioMaestrosLocales(directorio), directorio);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

test('guarda cada maestro por separado y recupera una versión completa', async () => {
  await conRepositorio(async (repositorio, directorio) => {
    const maestros = { productos: [{ id: 1 }], mesas: [{ id: 5 }], usuarios: [{ id: 2 }] };
    await repositorio.guardar(10, maestros);
    assert.deepEqual(await repositorio.obtener(), { version: 10, maestros });
    const indice = JSON.parse(await readFile(join(directorio, 'maestros', 'actual.json'), 'utf8'));
    assert.deepEqual((await readdir(join(directorio, 'maestros', 'versiones', indice.directorio))).sort(),
      ['mesas.json', 'productos.json', 'usuarios.json']);
  });
});

test('una versión incompleta o anterior no reemplaza la versión vigente', async () => {
  await conRepositorio(async repositorio => {
    const maestros = { productos: [], mesas: [] };
    await repositorio.guardar(10, maestros);
    assert.throws(() => repositorio.guardar(11, { productos: [] }), /productos y mesas/);
    await assert.rejects(repositorio.guardar(9, maestros), /posterior/);
    assert.deepEqual(await repositorio.obtener(), { version: 10, maestros });
  });
});

test('serializa actualizaciones simultáneas sin perder la última versión', async () => {
  await conRepositorio(async repositorio => {
    const primero = { productos: [{ id: 1 }], mesas: [] };
    const segundo = { productos: [{ id: 2 }], mesas: [] };
    await Promise.all([repositorio.guardar(11, primero), repositorio.guardar(12, segundo)]);
    assert.deepEqual(await repositorio.obtener(), { version: 12, maestros: segundo });
  });
});

test('coordina lecturas y retiradas sin dejar generaciones obsoletas', async () => {
  await conRepositorio(async (repositorio, directorio) => {
    await repositorio.guardar(1, { productos: [{ id: 1 }], mesas: [] });
    const lecturas = [];
    for (let version = 2; version <= 5; version++) {
      lecturas.push(repositorio.obtener());
      lecturas.push(repositorio.guardar(version, { productos: [{ id: version }], mesas: [] }));
    }
    const datos = (await Promise.all(lecturas)).filter(Boolean);
    assert.deepEqual(datos.map(lectura => lectura.maestros.productos[0].id), [1, 2, 3, 4]);
    assert.equal((await readdir(join(directorio, 'maestros', 'versiones'))).length, 1);
  });
});
