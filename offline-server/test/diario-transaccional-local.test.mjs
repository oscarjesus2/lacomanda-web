import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, rmdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';

async function conDiario(prueba) {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-diario-test-'));
  try {
    await prueba(new DiarioTransaccionalLocal(directorio), directorio);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

const transaccion = {
  id: 'operacion-1',
  cambios: [
    { tipo: 'pedidos', identificador: 'OFF-CAJA01-001', contenido: { mesa: 5, estado: 'liberada' } },
    { tipo: 'comprobantes-pendientes', identificador: 'OFF-CAJA01-001', contenido: { tipo: 'boleta' } },
  ],
};

test('registra juntos el pedido y el comprobante y recupera ambos tras reiniciar', async () => {
  await conDiario(async (diario, directorio) => {
    assert.equal(await diario.aplicar(transaccion), 'registrada');
    const recuperado = new DiarioTransaccionalLocal(directorio);
    await recuperado.iniciar();
    assert.deepEqual(await recuperado.obtener('pedidos', 'OFF-CAJA01-001'), { mesa: 5, estado: 'liberada' });
    assert.deepEqual(await recuperado.obtener('comprobantes-pendientes', 'OFF-CAJA01-001'), { tipo: 'boleta' });
    assert.equal((await readdir(join(directorio, 'transacciones'))).length, 1);
  });
});

test('un reintento antiguo no revierte una modificación posterior', async () => {
  await conDiario(async (diario, directorio) => {
    await diario.aplicar(transaccion);
    await diario.aplicar({
      id: 'operacion-2',
      cambios: [{ tipo: 'pedidos', identificador: 'OFF-CAJA01-001', contenido: { mesa: 5, estado: 'corregida' } }],
    });
    assert.equal(await diario.aplicar(transaccion), 'existente');
    const documento = JSON.parse(await readFile(join(directorio, 'pedidos', 'OFF-CAJA01-001.json'), 'utf8'));
    assert.equal(documento.estado, 'corregida');
    await assert.rejects(diario.aplicar({ ...transaccion, cambios: [{ ...transaccion.cambios[0] }] }), /otros datos/);
  });
});

test('si falla una proyección, el diario permite recuperar la operación completa', async () => {
  await conDiario(async (diario, directorio) => {
    const bloqueo = join(directorio, 'comprobantes-pendientes', 'OFF-CAJA01-001.json');
    await mkdir(bloqueo, { recursive: true });
    await assert.rejects(diario.aplicar(transaccion));
    await rmdir(bloqueo);

    const recuperado = new DiarioTransaccionalLocal(directorio);
    await recuperado.iniciar();
    assert.deepEqual(await recuperado.obtener('pedidos', 'OFF-CAJA01-001'), { mesa: 5, estado: 'liberada' });
    assert.deepEqual(await recuperado.obtener('comprobantes-pendientes', 'OFF-CAJA01-001'), { tipo: 'boleta' });
    assert.equal(await recuperado.aplicar(transaccion), 'existente');
  });
});

test('serializa las operaciones simultáneas y rechaza una transacción inválida', async () => {
  await conDiario(async (diario, directorio) => {
    const cambios = [1, 2, 3].map(numero => diario.aplicar({
      id: `operacion-${numero}`,
      cambios: [{ tipo: 'pedidos', identificador: `OFF-CAJA01-00${numero}`, contenido: { numero } }],
    }));
    assert.deepEqual(await Promise.all(cambios), ['registrada', 'registrada', 'registrada']);
    assert.throws(() => diario.aplicar({ id: 'invalida', cambios: [] }), /transacción/);
    assert.equal((await readdir(join(directorio, 'transacciones'))).length, 3);
  });
});

test('rechaza una modificación basada en una versión anterior sin aplicar ningún cambio parcial', async () => {
  await conDiario(async (diario, directorio) => {
    const inicial = { id: 'crear', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { mesa: 1 }, versionEsperada: 0 },
    ] };
    await diario.aplicar(inicial);
    const visto = await diario.obtenerConVersion('pedidos', 'OFF-1');
    await diario.aplicar({ id: 'cambio-mesero', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { mesa: 1, total: 20 }, versionEsperada: visto.version },
    ] });
    await assert.rejects(diario.aplicar({ id: 'cobro-antiguo', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { mesa: 1, pagado: true }, versionEsperada: visto.version },
      { tipo: 'comprobantes-pendientes', identificador: 'OFF-1', contenido: { tipo: 'boleta' }, versionEsperada: 0 },
    ] }), /ha cambiado/);
    assert.deepEqual(await diario.obtener('pedidos', 'OFF-1'), { mesa: 1, total: 20 });
    assert.equal(await diario.obtener('comprobantes-pendientes', 'OFF-1'), null);
    assert.equal((await readdir(join(directorio, 'transacciones'))).length, 2);
  });
});

test('conserva las versiones al reiniciar y permite reintentar una operación ya registrada', async () => {
  await conDiario(async (diario, directorio) => {
    const cambio = { id: 'crear', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { mesa: 1 }, versionEsperada: 0 },
    ] };
    await diario.aplicar(cambio);
    const reiniciado = new DiarioTransaccionalLocal(directorio);
    assert.deepEqual(await reiniciado.obtenerConVersion('pedidos', 'OFF-1'), { contenido: { mesa: 1 }, version: 1 });
    assert.equal(await reiniciado.aplicar(cambio), 'existente');
    await assert.rejects(reiniciado.aplicar({ ...cambio, id: 'otro' }), /ha cambiado/);
    assert.deepEqual(await reiniciado.obtenerConVersion('pedidos', 'nuevo'), { contenido: null, version: 0 });
  });
});

test('solo acepta versiones esperadas enteras no negativas', async () => {
  await conDiario(async diario => {
    for (const versionEsperada of [-1, 1.5, '1', null]) {
      assert.throws(() => diario.aplicar({ id: 'invalida', cambios: [
        { tipo: 'pedidos', identificador: 'OFF-1', contenido: {}, versionEsperada },
      ] }), /versión esperada/);
    }
  });
});

test('lista los pedidos actuales con sus versiones, incluso después de recuperar el diario', async () => {
  await conDiario(async (diario, directorio) => {
    await diario.aplicar(transaccion);
    await diario.aplicar({ id: 'actualizar', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-CAJA01-001', contenido: { mesa: 5, total: 15 }, versionEsperada: 1 },
      { tipo: 'pedidos', identificador: 'OFF-CAJA01-002', contenido: { mesa: 6 }, versionEsperada: 0 },
    ] });
    const reiniciado = new DiarioTransaccionalLocal(directorio);
    const pedidos = await reiniciado.listar('pedidos');
    assert.deepEqual(pedidos, [
      { identificador: 'OFF-CAJA01-001', contenido: { mesa: 5, total: 15 }, version: 2 },
      { identificador: 'OFF-CAJA01-002', contenido: { mesa: 6 }, version: 2 },
    ]);
    pedidos[0].contenido.total = 999;
    assert.equal((await reiniciado.obtener('pedidos', 'OFF-CAJA01-001')).total, 15);
    assert.throws(() => reiniciado.listar('no-valido'), /tipo de archivo/);
  });
});

test('dos estaciones que parten de la misma versión no pueden sobrescribir el mismo pedido', async () => {
  await conDiario(async diario => {
    await diario.aplicar({ id: 'crear', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { total: 10 }, versionEsperada: 0 },
    ] });
    const version = (await diario.obtenerConVersion('pedidos', 'OFF-1')).version;
    const resultados = await Promise.allSettled([20, 30].map((total, indice) => diario.aplicar({
      id: `estacion-${indice}`,
      cambios: [{ tipo: 'pedidos', identificador: 'OFF-1', contenido: { total }, versionEsperada: version }],
    })));
    assert.equal(resultados.filter(resultado => resultado.status === 'fulfilled').length, 1);
    assert.equal(resultados.filter(resultado => resultado.status === 'rejected').length, 1);
    assert.equal((await diario.listarDesde(0)).length, 2);
  });
});

test('conserva los datos de la operación para regularizarlos junto a los cambios locales', async () => {
  await conDiario(async (diario, directorio) => {
    const registro = {
      id: 'pago-1',
      operacion: { tipo: 'registrar-venta', datos: { pedido: 'OFF-1', documento: 'boleta', pago: { monto: 10 } } },
      cambios: [
        { tipo: 'pedidos', identificador: 'OFF-1', contenido: { pagado: true }, versionEsperada: 0 },
        { tipo: 'comprobantes-pendientes', identificador: 'OFF-1', contenido: { tipo: 'boleta' }, versionEsperada: 0 },
      ],
    };
    await diario.aplicar(registro);
    const reiniciado = new DiarioTransaccionalLocal(directorio);
    assert.deepEqual((await reiniciado.listarDesde(0))[0].operacion, registro.operacion);
    assert.equal(await reiniciado.aplicar(registro), 'existente');
    await assert.rejects(reiniciado.aplicar({
      ...registro,
      operacion: { ...registro.operacion, datos: { pedido: 'otro' } },
    }), /otros datos/);
  });
});

test('rechaza operaciones incompletas antes de guardar datos', async () => {
  await conDiario(async diario => {
    for (const operacion of [null, {}, { tipo: 'Venta', datos: {} }, { tipo: 'venta', datos: null }]) {
      assert.throws(() => diario.aplicar({ id: 'op', operacion, cambios: [
        { tipo: 'pedidos', identificador: 'OFF-1', contenido: {} },
      ] }), /operación local/);
    }
    assert.deepEqual(await diario.listarDesde(0), []);
  });
});
