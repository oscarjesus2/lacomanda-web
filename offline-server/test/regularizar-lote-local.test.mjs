import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { RepositorioLotesLocales } from '../src/infrastructure/archivos/repositorio-lotes-locales.mjs';
import { RegularizarLoteLocal } from '../src/application/use-cases/regularizar-lote-local.mjs';
import { ObtenerEstadoCaja } from '../src/application/use-cases/obtener-estado-caja.mjs';
import { ClienteRegularizacionNube } from '../src/infrastructure/nube/cliente-regularizacion-nube.mjs';

const contexto = { tenantId: 'restaurante-a', identificadorEstacion: 'caja-1' };

async function conCaja(prueba) {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-lotes-test-'));
  try {
    await prueba(new DiarioTransaccionalLocal(directorio), new RepositorioLotesLocales(directorio), directorio);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

function cambio(numero) {
  return { id: `operacion-${numero}`, operacion: { tipo: 'operacion-prueba', datos: { numero } }, cambios: [{
    tipo: 'pedidos', identificador: `OFF-CAJA01-${numero}`, contenido: { numero },
  }] };
}

function confirmar(lote) {
  return { confirmado: true, id: lote.id, resultados: lote.operaciones.map(item => ({ idOperacion: item.id })) };
}

test('confirmar un lote mantiene el estado pendiente si llegó otra operación durante el envío', async () => {
  await conCaja(async (diario, lotes) => {
    const estado = new ObtenerEstadoCaja({ obtener: async () => null }, false, contexto, diario, lotes);
    const regularizacion = new RegularizarLoteLocal(diario, lotes, {
      regularizar: async lote => {
        assert.equal((await estado.ejecutar()).regularizacionPendiente, true);
        if (lote.desdeSecuencia === 1) await diario.aplicar(cambio(2));
        return confirmar(lote);
      },
    }, contexto);
    await diario.aplicar(cambio(1));
    await regularizacion.ejecutar();
    assert.equal((await estado.ejecutar()).regularizacionPendiente, true);
    await regularizacion.ejecutar();
    assert.equal((await estado.ejecutar()).regularizacionPendiente, false);
  });
});

test('envía todas las operaciones pendientes en una sola solicitud y confirma el lote', async () => {
  await conCaja(async (diario, lotes) => {
    await diario.aplicar(cambio(1));
    await diario.aplicar(cambio(2));
    const recibidos = [];
    const nube = { regularizar: async lote => {
      recibidos.push(structuredClone(lote));
      return confirmar(lote);
    } };
    const caso = new RegularizarLoteLocal(diario, lotes, nube, contexto);
    const resultado = await caso.ejecutar();
    assert.equal(resultado.operaciones, 2);
    assert.equal(recibidos.length, 1);
    assert.equal(recibidos[0].operaciones.length, 2);
    assert.deepEqual(recibidos[0].contexto, contexto);
    assert.deepEqual(await caso.ejecutar(), { enviado: false });
  });
});

test('un lote nuevo envía los datos de la operación y deja las proyecciones voluminosas en caja', async () => {
  await conCaja(async (diario, lotes) => {
    const registro = cambio(1);
    registro.cambios.push({ tipo: 'estado-local', identificador: 'mesas',
      contenido: { datos: Array.from({ length: 900 }, (_, id) => ({ IdEspacio: id, Ocupado: 1, Descripcion: 'Mesa ' + id })) } });
    await diario.aplicar(registro);
    const [original] = await diario.listarDesde(0);
    let recibida;
    await new RegularizarLoteLocal(diario, lotes, { regularizar: async lote => {
      [recibida] = lote.operaciones;
      return confirmar(lote);
    } }, contexto).ejecutar();
    assert.deepEqual(recibida.operacion, original.operacion);
    assert.deepEqual(recibida.cambios, original.cambios.map(({ tipo, identificador }) => ({ tipo, identificador })));
    assert.ok(Buffer.byteLength(JSON.stringify(recibida)) < Buffer.byteLength(JSON.stringify(original)) / 20);
    assert.deepEqual(await diario.obtenerTransaccion(registro.id), original);
  });
});

test('reenvía literalmente un lote antiguo ya aplicado y después crea el siguiente lote compacto', async () => {
  await conCaja(async (diario, lotes, directorio) => {
    await diario.aplicar(cambio(1));
    const anterior = { id: randomUUID(), contexto, desdeSecuencia: 1, hastaSecuencia: 1, operaciones: await diario.listarDesde(0) };
    const cuerpoAplicado = JSON.stringify(anterior);
    const acuse = confirmar(anterior);
    await lotes.guardarActivo(anterior);
    await diario.aplicar(cambio(2));
    const cliente = new ClienteRegularizacionNube({ url: 'https://api.example.test/offline/lotes', obtenerToken: () => 'sesion',
      fetchImpl: async (_url, { body }) => {
        const recibido = JSON.parse(body);
        if (recibido.id === anterior.id) {
          assert.equal(body, cuerpoAplicado);
          return Response.json(acuse);
        }
        assert.equal(recibido.desdeSecuencia, 2);
        assert.deepEqual(recibido.operaciones[0].cambios, [{ tipo: 'pedidos', identificador: 'OFF-CAJA01-2' }]);
        return Response.json(confirmar(recibido));
      } });
    const caso = new RegularizarLoteLocal(new DiarioTransaccionalLocal(directorio), new RepositorioLotesLocales(directorio), cliente, contexto);
    assert.equal((await caso.ejecutar()).id, anterior.id);
    assert.equal((await caso.ejecutar()).operaciones, 1);
    assert.deepEqual(await caso.ejecutar(), { enviado: false });
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 2);
  });
});

test('conserva en caja la correspondencia recibida entre número offline y número oficial', async () => {
  await conCaja(async (diario, lotes, directorio) => {
    await diario.aplicar(cambio(1));
    const resultados = [{ idOperacion: 'operacion-1', numeroOffline: 'OFF-1', idPedido: 55, nroPedido: 102 }];
    const nube = { regularizar: async lote => ({ confirmado: true, id: lote.id, resultados }) };
    const enviado = await new RegularizarLoteLocal(diario, lotes, nube, contexto).ejecutar();
    const reiniciado = new RepositorioLotesLocales(directorio);
    const confirmado = await reiniciado.obtenerConfirmado(enviado.id);
    assert.deepEqual(confirmado.respuesta.resultados, resultados);
    assert.equal(confirmado.contexto.tenantId, contexto.tenantId);
    assert.equal(confirmado.fechaConfirmacionUtc.endsWith('Z'), true);
  });
});

test('no envía cambios que no tienen los datos de la operación original', async () => {
  await conCaja(async (diario, lotes) => {
    await diario.aplicar({ id: 'antigua', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { total: 20 } },
    ] });
    let enviada = false;
    const nube = { regularizar: async () => { enviada = true; } };
    await assert.rejects(new RegularizarLoteLocal(diario, lotes, nube, contexto).ejecutar(), /sin los datos necesarios/);
    assert.equal(enviada, false);
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 0);
    assert.equal(await lotes.obtenerActivo(), null);
    assert.equal((await diario.listarDesde(0)).length, 1);
  });
});

test('si se pierde la respuesta, conserva exactamente el lote y lo reintenta después del reinicio', async () => {
  await conCaja(async (diario, lotes, directorio) => {
    await diario.aplicar(cambio(1));
    let primerEnvio;
    const nubeSinRespuesta = { regularizar: async lote => {
      primerEnvio = structuredClone(lote);
      throw new Error('Respuesta perdida');
    } };
    await assert.rejects(new RegularizarLoteLocal(diario, lotes, nubeSinRespuesta, contexto).ejecutar(), /Respuesta perdida/);
    await diario.aplicar(cambio(2));
    const enviado = [];
    const nube = { regularizar: async lote => {
      enviado.push(structuredClone(lote));
      return confirmar(lote);
    } };
    const reiniciado = new RegularizarLoteLocal(
      new DiarioTransaccionalLocal(directorio), new RepositorioLotesLocales(directorio), nube, contexto,
    );
    await reiniciado.ejecutar();
    assert.deepEqual(enviado[0], primerEnvio);
    await reiniciado.ejecutar();
    assert.equal(enviado[1].operaciones.length, 1);
    assert.equal(enviado[1].operaciones[0].id, 'operacion-2');
  });
});

test('una confirmación incorrecta conserva el lote completo sin avanzar el cursor', async () => {
  await conCaja(async (diario, lotes) => {
    await diario.aplicar(cambio(1));
    const caso = new RegularizarLoteLocal(diario, lotes, {
      regularizar: async () => ({ confirmado: true, id: 'otro-lote' }),
    }, contexto);
    await assert.rejects(caso.ejecutar(), /no confirmó/);
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 0);
    assert.equal((await lotes.obtenerActivo()).operaciones.length, 1);
  });
});

test('una respuesta sin todos los resultados no descarta el lote local', async () => {
  await conCaja(async (diario, lotes) => {
    await diario.aplicar(cambio(1));
    await diario.aplicar(cambio(2));
    const caso = new RegularizarLoteLocal(diario, lotes, {
      regularizar: async lote => ({ confirmado: true, id: lote.id, resultados: [{ idOperacion: 'operacion-1' }] }),
    }, contexto);
    await assert.rejects(caso.ejecutar(), /no confirmó el lote completo/);
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 0);
    assert.equal((await lotes.obtenerActivo()).operaciones.length, 2);
  });
});

test('si no puede guardar el acuse mantiene el lote para reintentar sin perder datos', async () => {
  await conCaja(async (diario, lotes, directorio) => {
    await diario.aplicar(cambio(1));
    let bloqueo;
    let envios = 0;
    const nube = { regularizar: async lote => {
      envios++;
      if (envios === 1) {
        bloqueo = join(directorio, 'lotes', 'confirmados', `${lote.id}.json`);
        await mkdir(bloqueo, { recursive: true });
      }
      return confirmar(lote);
    } };
    const caso = new RegularizarLoteLocal(diario, lotes, nube, contexto);
    await assert.rejects(caso.ejecutar());
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 0);
    assert.equal((await lotes.obtenerActivo()).operaciones.length, 1);
    await rmdir(bloqueo);
    assert.equal((await caso.ejecutar()).enviado, true);
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 1);
    assert.equal(envios, 2);
  });
});

test('no envía un lote guardado si la caja está configurada para otra sucursal', async () => {
  await conCaja(async (diario, lotes) => {
    await diario.aplicar(cambio(1));
    const desconectada = { regularizar: async () => { throw new Error('Sin conexión'); } };
    await assert.rejects(new RegularizarLoteLocal(diario, lotes, desconectada, contexto).ejecutar(), /Sin conexión/);
    let llamada = false;
    const nube = { regularizar: async () => { llamada = true; } };
    const otra = { tenantId: 'restaurante-b', identificadorEstacion: 'caja-1' };
    await assert.rejects(new RegularizarLoteLocal(diario, lotes, nube, otra).ejecutar(), /otra sucursal/);
    assert.equal(llamada, false);
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 0);
  });
});

test('una respuesta HTTP perdida conserva el lote y reenvía el mismo identificador al recuperarse', async () => {
  await conCaja(async (diario, lotes, directorio) => {
    await diario.aplicar(cambio(1));
    const recibidos = [];
    const cliente = new ClienteRegularizacionNube({
      url: 'https://api.example.test/offline/regularizar',
      obtenerToken: async () => 'sesion',
      fetchImpl: async (_url, opciones) => {
        const recibido = JSON.parse(opciones.body);
        recibidos.push(recibido);
        if (recibidos.length === 1) throw new Error('La respuesta se perdió');
        return new Response(JSON.stringify(confirmar(recibido)), { status: 200 });
      },
    });
    await assert.rejects(new RegularizarLoteLocal(diario, lotes, cliente, contexto).ejecutar(),
      error => error.codigoHttp === 502 && error.cause.message === 'La respuesta se perdió');
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 0);
    const reiniciado = new RegularizarLoteLocal(
      new DiarioTransaccionalLocal(directorio), new RepositorioLotesLocales(directorio), cliente, contexto,
    );
    const respuesta = await reiniciado.ejecutar();
    assert.equal(respuesta.enviado, true);
    assert.deepEqual(recibidos[1], recibidos[0]);
    assert.equal((await lotes.obtenerCursor()).hastaSecuencia, 1);
  });
});

test('incluye en el lote los datos originales de pedidos y ventas tras reiniciar caja', async () => {
  await conCaja(async (diario, _lotes, directorio) => {
    const operacionPedido = { tipo: 'operacion-prueba', datos: { numero: 'OFF-1', productos: [{ id: 5, cantidad: 2 }] } };
    const operacionVenta = { tipo: 'registrar-venta', datos: { pedido: 'OFF-1', tipo: 'boleta', correo: 'cliente@example.test' } };
    await diario.aplicar({ id: 'pedido-1', operacion: operacionPedido, cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { estado: 'abierto' } },
    ] });
    await diario.aplicar({ id: 'venta-1', operacion: operacionVenta, cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { estado: 'pagado' } },
      { tipo: 'comprobantes-pendientes', identificador: 'OFF-1', contenido: { tipo: 'boleta' } },
    ] });
    let enviado;
    const nube = { regularizar: async lote => {
      enviado = lote;
      return confirmar(lote);
    } };
    await new RegularizarLoteLocal(new DiarioTransaccionalLocal(directorio),
      new RepositorioLotesLocales(directorio), nube, contexto).ejecutar();
    assert.deepEqual(enviado.operaciones.map(item => item.operacion), [operacionPedido, operacionVenta]);
  });
});
