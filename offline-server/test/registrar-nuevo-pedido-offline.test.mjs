import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';
import { RegistrarNuevoPedidoOffline } from '../src/application/use-cases/registrar-nuevo-pedido-offline.mjs';
import { validarDetallesNuevos } from '../src/application/validators/validar-nuevo-pedido-offline.mjs';
import { ObtenerMaestroLocal } from '../src/application/use-cases/obtener-maestro-local.mjs';
import { ConfirmarImpresionPedidoOffline } from '../src/application/use-cases/confirmar-impresion-pedido-offline.mjs';
import { RepositorioLotesLocales } from '../src/infrastructure/archivos/repositorio-lotes-locales.mjs';
import { RegularizarLoteLocal } from '../src/application/use-cases/regularizar-lote-local.mjs';
import { SincronizarMaestrosLocales } from '../src/application/use-cases/sincronizar-maestros-locales.mjs';

const id = '11a11111-1111-4111-8111-111111111111';
const otroId = '22a22222-2222-4222-8222-222222222222';
test('el cargo delivery usa la tarifa de la dirección seleccionada incluso si el producto tiene precio variable', () => {
  const maestros = {
    productos: [{ IdProducto: 4, Activo: true, Precio: 9, EsCargoDelivery: true, SinPrecio: true },
      { IdProducto: 8, Activo: true, Precio: 5 }],
    clientesdelivery: [{ IdCliente: 2, Item: 3, PrecioDelivery: 5 }],
  };
  const pedido = { IdCanalVenta: 4, IdClienteDelivery: 2, ItemClienteDelivery: 3 };
  const detalle = { Producto: { IdProducto: 4 }, Cantidad: 1, IdPedido: 0, Precio: 5, Subtotal: 5 };
  validarDetallesNuevos([detalle], maestros, pedido);
  const producto = { ...detalle, Producto: { IdProducto: 8 } };
  validarDetallesNuevos([producto], maestros, pedido, true);
  assert.throws(() => validarDetallesNuevos([producto], maestros, pedido), /cargo/);
  assert.throws(() => validarDetallesNuevos([detalle, detalle], maestros, pedido), /cargo/);
  assert.throws(() => validarDetallesNuevos([detalle], maestros, pedido, true), /cargo/);
  assert.throws(() => validarDetallesNuevos([{ ...detalle, Precio: 9, Subtotal: 9 }], maestros, pedido), /detalle/);
  assert.throws(() => validarDetallesNuevos([{ ...detalle, Cantidad: 2, Subtotal: 10 }], maestros, pedido), /detalle/);
});
const solicitud = {
  idOperacion: id, idEstacion: 5, idUsuario: 8,
  pedido: {
    IdPedido: 0, NroCuenta: 1, IdCaja: 1, IdTurno: 2, IdEmpleado: 3, IdCanalVenta: 2,
    IdEspacio: 7, Total: 20,
    ListaPedidoDet: [{ IdPedido: 0, Producto: { IdProducto: 4 }, Cantidad: 2, Precio: 10, Subtotal: 20 }],
  },
};

async function conCaja(prueba) {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-pedido-test-'));
  try {
    const diario = new DiarioTransaccionalLocal(directorio);
    const maestros = new RepositorioMaestrosLocales(directorio);
    await maestros.guardar(1, {
      productos: [{ IdProducto: 4, Activo: true }],
      cajas: [{ IdCaja: 1 }], turnos: [{ IdTurno: 2, IdCaja: 1, Estado: 1 }],
      mesas: [{ IdEspacio: 7, Activo: true, Ocupado: 0 }],
      usuarios: [{ IdUsuario: 8, NombreUsuario: 'Ana', Activo: true, IdNivel: 3, IdEmpleado: 3 }],
    });
    await prueba(new RegistrarNuevoPedidoOffline(maestros, diario), diario, maestros, directorio);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

test('guarda el pedido y ocupa la mesa en una sola transacción recuperable', async () => {
  await conCaja(async (caso, diario, maestros, directorio) => {
    const resultado = await caso.ejecutar(solicitud);
    assert.equal(resultado.numeroOffline, `OFF-E5-${id}`);
    assert.equal(resultado.resultado, 'registrada');
    const reiniciado = new DiarioTransaccionalLocal(directorio);
    const pedido = await reiniciado.obtener('pedidos', resultado.numeroOffline);
    assert.equal(pedido.NroPedidoOffline, resultado.numeroOffline);
    assert.equal(pedido.IdPedido, 0);
    assert.equal((await new ObtenerMaestroLocal(maestros, reiniciado).ejecutar('mesas')).datos[0].Ocupado, 1);
    const transacciones = await reiniciado.listarDesde(0);
    assert.equal(transacciones.length, 1);
    assert.deepEqual(transacciones[0].operacion.datos.solicitud, solicitud);
    assert.equal(transacciones[0].cambios.length, 2);
    assert.deepEqual(await new RegistrarNuevoPedidoOffline(maestros, reiniciado).ejecutar(solicitud),
      { numeroOffline: resultado.numeroOffline, resultado: 'existente' });
  });
});

test('dos estaciones no pueden abrir simultáneamente la misma mesa', async () => {
  await conCaja(async (caso, diario) => {
    const respuestas = await Promise.allSettled([
      caso.ejecutar(solicitud),
      caso.ejecutar({ ...solicitud, idOperacion: otroId, idEstacion: 6 }),
    ]);
    assert.equal(respuestas.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(respuestas.filter(item => item.status === 'rejected').length, 1);
    assert.equal((await diario.listarDesde(0)).length, 1);
  });
});

test('no permite reutilizar un identificador de operación con datos distintos', async () => {
  await conCaja(async caso => {
    await caso.ejecutar(solicitud);
    await assert.rejects(caso.ejecutar({ ...solicitud, idUsuario: 9 }), /otros datos/);
  });
});

test('no guarda un pedido si cambió la copia de maestros antes de confirmar', async () => {
  await conCaja(async (_caso, diario, maestros) => {
    let consultas = 0;
    const cambiante = { obtener: async () => {
      const snapshot = await maestros.obtener();
      return { ...snapshot, version: ++consultas === 1 ? snapshot.version : snapshot.version + 1 };
    } };
    await assert.rejects(new RegistrarNuevoPedidoOffline(cambiante, diario).ejecutar(solicitud), /maestros cambiaron/);
    assert.equal((await diario.listarDesde(0)).length, 0);
  });
});

test('rechaza un pedido preparado con una copia reemplazada durante la operación', async () => {
  await conCaja(async (_caso, diario, maestros) => {
    let liberar;
    let avisar;
    const espera = new Promise(resolve => liberar = resolve);
    const lectura = new Promise(resolve => avisar = resolve);
    let primera = true;
    const repositorio = { obtener: async () => {
      const snapshot = await maestros.obtener();
      if (primera) { primera = false; avisar(); await espera; }
      return snapshot;
    } };
    const operacion = new RegistrarNuevoPedidoOffline(repositorio, diario).ejecutar(solicitud);
    try {
      await lectura;
      const actual = await maestros.obtener();
      const sincronizacion = new SincronizarMaestrosLocales({ obtenerInstantanea: async () => ({
        version: actual.version + 1, maestros: { ...actual.maestros, productos: [] },
      }) }, maestros, diario);
      await sincronizacion.ejecutar();
    } finally {
      liberar();
    }
    await assert.rejects(operacion, /maestros cambiaron/);
    assert.equal((await diario.listarDesde(0)).length, 0);
  });
});

test('rechaza productos, usuarios y datos de delivery inválidos sin escribir', async () => {
  await conCaja(async (caso, diario) => {
    await assert.rejects(caso.ejecutar({ ...solicitud, idUsuario: 99 }), /usuario/);
    await assert.rejects(caso.ejecutar({ ...solicitud, pedido: { ...solicitud.pedido, ListaPedidoDet: [
      { ...solicitud.pedido.ListaPedidoDet[0], Producto: { IdProducto: 99 } },
    ] } }), /producto/);
    await assert.rejects(caso.ejecutar({ ...solicitud, pedido: {
      ...solicitud.pedido, IdCanalVenta: 4, IdClienteDelivery: 5, ItemClienteDelivery: 0,
    } }), /delivery/);
    assert.deepEqual(await diario.listarDesde(0), []);
  });
});

test('no registra pedidos si la caja o el turno no corresponden a la copia local', async () => {
  await conCaja(async (caso, diario) => {
    await assert.rejects(caso.ejecutar({ ...solicitud, pedido: { ...solicitud.pedido, IdCaja: 99 } }), /caja/);
    await assert.rejects(caso.ejecutar({ ...solicitud, pedido: { ...solicitud.pedido, IdTurno: 99 } }), /turno abierto/);
    await assert.rejects(caso.ejecutar({ ...solicitud, pedido: { ...solicitud.pedido, ListaPedidoDet: [
      { ...solicitud.pedido.ListaPedidoDet[0], Subtotal: 1 },
    ] } }), /producto o detalle/);
    assert.deepEqual(await diario.listarDesde(0), []);
  });
});

test('espera la confirmación de impresión antes de preparar y enviar el lote', async () => {
  await conCaja(async (caso, diario, maestros, directorio) => {
    const { numeroOffline } = await caso.ejecutar(solicitud);
    let envios = 0;
    const nube = { regularizar: async lote => { envios++; return { id: lote.id, confirmado: true,
      resultados: lote.operaciones.map(item => item.operacion.tipo === 'registrar-pedido'
        ? { idOperacion: item.id, numeroOffline, idPedido: 55, nroPedido: 102, nroCuenta: 1 }
        : { idOperacion: item.id }),
    }; } };
    const lote = new RegularizarLoteLocal(diario, new RepositorioLotesLocales(directorio), nube,
      { tenantId: 'restaurante', identificadorEstacion: 'caja' });
    await assert.rejects(lote.ejecutar(), /sin confirmación de impresión/);
    assert.equal(envios, 0);
    const confirmacion = { idOperacion: otroId, idOperacionPedido: id,
      idEstacion: 5, idUsuario: 8, numeroOffline, impresoras: ['Cocina', 'Bar'] };
    const confirmar = new ConfirmarImpresionPedidoOffline(maestros, diario);
    assert.deepEqual(await confirmar.ejecutar(confirmacion), { resultado: 'registrada' });
    assert.deepEqual(await confirmar.ejecutar(confirmacion), { resultado: 'existente' });
    assert.equal((await lote.ejecutar()).operaciones, 2);
    assert.equal(envios, 1);
  });
});

test('no confirma impresiones vacías ni de otro pedido', async () => {
  await conCaja(async (caso, diario, maestros) => {
    const { numeroOffline } = await caso.ejecutar(solicitud);
    const confirmar = new ConfirmarImpresionPedidoOffline(maestros, diario);
    const datos = { idOperacion: otroId, idOperacionPedido: id,
      idEstacion: 5, idUsuario: 8, numeroOffline, impresoras: ['Cocina'] };
    await assert.rejects(confirmar.ejecutar({ ...datos, impresoras: [] }), /confirmación de impresión/);
    await assert.rejects(confirmar.ejecutar({ ...datos, numeroOffline: 'OFF-E5-otro' }), /no corresponde/);
    assert.equal((await diario.listarDesde(0)).length, 1);
  });
});
