import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';
import { RegistrarNuevoPedidoOffline } from '../src/application/use-cases/registrar-nuevo-pedido-offline.mjs';
import { RegistrarCobroPendienteOffline } from '../src/application/use-cases/registrar-cobro-pendiente-offline.mjs';
import { RepositorioLotesLocales } from '../src/infrastructure/archivos/repositorio-lotes-locales.mjs';
import { RegularizarLoteLocal } from '../src/application/use-cases/regularizar-lote-local.mjs';
import { ConfirmarImpresionPedidoOffline } from '../src/application/use-cases/confirmar-impresion-pedido-offline.mjs';

const pedidoId = '11a11111-1111-4111-8111-111111111111';
const pagoId = '22a22222-2222-4222-8222-222222222222';
const solicitudPedido = {
  idOperacion: pedidoId, idEstacion: 5, idUsuario: 8,
  pedido: { IdPedido: 0, NroCuenta: 1, IdCaja: 1, IdTurno: 2, IdEmpleado: 3,
    IdCanalVenta: 2, IdEspacio: 7, Total: 20,
    ListaPedidoDet: [{ IdPedido: 0, Producto: { IdProducto: 4 }, Cantidad: 2, Precio: 10, Subtotal: 20 }] },
};

async function conCaja(prueba) {
  const temporal = resolve(tmpdir());
  const ruta = await mkdtemp(join(temporal, 'lacomanda-cobro-test-'));
  try {
    const diario = new DiarioTransaccionalLocal(ruta);
    const maestros = new RepositorioMaestrosLocales(ruta);
    await maestros.guardar(1, { productos: [{ IdProducto: 4, Activo: true }], pedidos: [],
      cajas: [{ IdCaja: 1 }], turnos: [{ IdTurno: 2, IdCaja: 1, Estado: 1 }],
      mesas: [{ IdEspacio: 7, Activo: true, Ocupado: 0 }],
      usuarios: [{ IdUsuario: 8, NombreUsuario: 'Ana', Activo: true, IdNivel: 2, IdEmpleado: 3 }] });
    const pedido = await new RegistrarNuevoPedidoOffline(maestros, diario).ejecutar(solicitudPedido);
    const solicitud = { idOperacion: pagoId, idEstacion: 5, idUsuario: 8,
      referenciaPedido: pedido.numeroOffline, versionPedido: 1, correoComprobante: 'cliente@example.test',
      documento: { usarClienteGenerico: true, cliente: null,
        venta: { IdTipoDocumento: 2, IdCaja: 1, Importe: 20, Total: 20, Propina: 2, NumDocumento: 0, Serie: '' },
        listaPago: [{ IdTipoPago: 1, MontoPagado: 20, Vuelto: 0, Propina: 2 }] } };
    await prueba(new RegistrarCobroPendienteOffline(maestros, diario), diario, maestros, solicitud, ruta);
  } finally {
    if (!resolve(ruta).startsWith(temporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(ruta, { recursive: true, force: true });
  }
}

test('conserva el cobro sin correlativo y libera la mesa en la misma transacción', async () => {
  await conCaja(async (caso, diario, maestros, solicitud, ruta) => {
    assert.deepEqual(await caso.ejecutar(solicitud), { referencia: pagoId, resultado: 'registrada' });
    const reiniciado = new DiarioTransaccionalLocal(ruta);
    assert.equal((await reiniciado.obtener('pedidos', solicitud.referenciaPedido)).Estado, 2);
    assert.equal((await reiniciado.obtener('estado-local', 'mesas')).datos[0].Ocupado, 0);
    const pendiente = await reiniciado.obtener('comprobantes-pendientes', pagoId);
    assert.equal(pendiente.documento.venta.NumDocumento, 0);
    assert.equal(pendiente.documento.venta.Serie, '');
    assert.equal(pendiente.correoComprobante, 'cliente@example.test');
    assert.equal(pendiente.documento.listaPago[0].Propina, 2);
    const operaciones = await reiniciado.listarDesde(0);
    assert.equal(operaciones.length, 2);
    assert.deepEqual(operaciones[1].operacion.datos.solicitud, solicitud);
    assert.equal(operaciones[1].operacion.datos.previo.ListaPedidoDet[0].IdProducto, 4);
    assert.equal(operaciones[1].cambios.length, 3);
    assert.equal((await new RegistrarCobroPendienteOffline(maestros, reiniciado).ejecutar(solicitud)).resultado, 'existente');
  });
});

test('comprueba documentos configurados, pagos mixtos, vuelto, propina y total de la cuenta', async () => {
  await conCaja(async (caso, diario, maestros, solicitud) => {
    const copia = await maestros.obtener();
    Object.assign(copia.maestros, { documentos: [{ IdTipoDocumento: 5 }], tarjetas: [{ IdTarjeta: 2 }],
      monedas: [{ IdMoneda: 'EUR' }], tipospago: [{ IdTipoPago: 1 }, { IdTipoPago: 3 }, { IdTipoPago: 8 }] });
    await maestros.guardar(2, copia.maestros);
    const venta = { ...solicitud.documento.venta, IdTipoDocumento: 5 };
    const pagos = [
      { IdTipoPago: 1, IdMoneda: 'EUR', MontoPagado: 15, Vuelto: 5, Propina: 0 },
      { IdTipoPago: 3, IdMoneda: 'EUR', IdTarjeta: 2, MontoPagado: 10, Vuelto: 0, Propina: 2 },
    ];
    const documento = { ...solicitud.documento, venta, listaPago: pagos };
    await assert.rejects(caso.ejecutar(solicitud), /venta pendiente/);
    await assert.rejects(caso.ejecutar({ ...solicitud, versionMaestros: 1, documento }), /copia de caja/);
    await assert.rejects(caso.ejecutar({ ...solicitud, documento: { ...documento, listaPago: [{ ...pagos[0], IdTipoPago: 8 }] } }), /pago/);
    await assert.rejects(caso.ejecutar({ ...solicitud, documento: { ...documento, venta: { ...venta, Dscto: 5 } } }), /importe/);
    assert.equal((await diario.listarDesde(0)).length, 1);
    assert.equal((await caso.ejecutar({ ...solicitud, versionMaestros: 2, documento })).resultado, 'registrada');
  });
});

test('rechaza correo inválido, correlativo real y pago insuficiente sin liberar la mesa', async () => {
  await conCaja(async (caso, diario, _maestros, solicitud) => {
    await assert.rejects(caso.ejecutar({ ...solicitud, correoComprobante: '' }), /correo/);
    await assert.rejects(caso.ejecutar({ ...solicitud, documento: { ...solicitud.documento,
      venta: { ...solicitud.documento.venta, NumDocumento: 101 } } }), /venta pendiente/);
    await assert.rejects(caso.ejecutar({ ...solicitud, documento: { ...solicitud.documento,
      listaPago: [{ IdTipoPago: 1, MontoPagado: 10, Vuelto: 0, Propina: 2 }] } }), /no cubren/);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
    assert.equal(await diario.obtener('comprobantes-pendientes', pagoId), null);
  });
});

test('el importe debe coincidir con los detalles activos, como en el cobro online', async () => {
  await conCaja(async (caso, diario, maestros, solicitud) => {
    await assert.rejects(caso.ejecutar({ ...solicitud, documento: { ...solicitud.documento,
      venta: { ...solicitud.documento.venta, Importe: 21 } } }), /no coincide/);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
    const snapshot = await maestros.obtener();
    snapshot.maestros.pedidos = [{ ...solicitudPedido.pedido, IdPedido: 123, NroCuenta: 1,
      NroPedido: 456, Estado: 1, ListaPedidoDet: [
        { Subtotal: 20, Estado: 1 }, { Subtotal: 100, Estado: 0 },
      ] }];
    await maestros.guardar(2, snapshot.maestros);
    await caso.ejecutar({ ...solicitud, referenciaPedido: 'ONLINE-123-1', versionPedido: 0 });
    assert.equal((await diario.obtener('pedidos', 'ONLINE-123-1')).Estado, 2);
  });
});

test('no libera una cuenta existente si la copia no indica el estado de sus detalles', async () => {
  await conCaja(async (caso, diario, maestros, solicitud) => {
    const snapshot = await maestros.obtener();
    snapshot.maestros.pedidos = [{ ...solicitudPedido.pedido, IdPedido: 123, NroCuenta: 1,
      NroPedido: 456, Estado: 1 }];
    await maestros.guardar(2, snapshot.maestros);
    await assert.rejects(caso.ejecutar({ ...solicitud, referenciaPedido: 'ONLINE-123-1', versionPedido: 0 }),
      /detalle del pedido/);
    assert.equal(await diario.obtener('comprobantes-pendientes', pagoId), null);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
  });
});

test('no acepta cobros sin caja y turno abiertos en la copia local', async () => {
  await conCaja(async (caso, diario, maestros, solicitud) => {
    const snapshot = await maestros.obtener();
    snapshot.maestros.turnos = [];
    await maestros.guardar(2, snapshot.maestros);
    await assert.rejects(caso.ejecutar(solicitud), /turno abierto/);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
    assert.equal(await diario.obtener('comprobantes-pendientes', pagoId), null);
  });
});

test('dos cobros simultáneos de la misma cuenta solo registran uno', async () => {
  await conCaja(async (caso, diario, _maestros, solicitud) => {
    const otroId = '33a33333-3333-4333-8333-333333333333';
    const resultados = await Promise.allSettled([caso.ejecutar(solicitud), caso.ejecutar({ ...solicitud, idOperacion: otroId })]);
    assert.equal(resultados.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(resultados.filter(item => item.status === 'rejected').length, 1);
    assert.equal((await diario.listar('comprobantes-pendientes')).length, 1);
  });
});

test('no libera la mesa si cambian los maestros durante el cobro', async () => {
  await conCaja(async (_caso, diario, maestros, solicitud) => {
    const inicial = await maestros.obtener();
    let consultas = 0;
    const cambiante = { obtener: async () => ({ ...inicial, version: ++consultas < 3 ? inicial.version : inicial.version + 1 }) };
    await assert.rejects(new RegistrarCobroPendienteOffline(cambiante, diario).ejecutar(solicitud), /maestros cambiaron/);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
    assert.equal(await diario.obtener('comprobantes-pendientes', pagoId), null);
  });
});

test('no libera la mesa si queda otra cuenta activa', async () => {
  await conCaja(async (caso, diario, _maestros, solicitud) => {
    await diario.aplicar({ id: 'cuenta-adicional', operacion: { tipo: 'crear-cuenta', datos: {} }, cambios: [
      { tipo: 'pedidos', identificador: 'OFF-OTRO', contenido: { IdEspacio: 7, Estado: 1 } },
    ] });
    await caso.ejecutar(solicitud);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
  });
});

test('cierres simultáneos de dos cuentas no dejan la mesa ocupada tras reintentar', async () => {
  await conCaja(async (caso, diario, _maestros, solicitud) => {
    await diario.aplicar({ id: 'cuenta-adicional', operacion: { tipo: 'crear-cuenta', datos: {} }, cambios: [
      { tipo: 'pedidos', identificador: 'OFF-OTRO', contenido: { ...solicitudPedido.pedido, Estado: 1,
        ListaPedidoDet: solicitudPedido.pedido.ListaPedidoDet.map(detalle => ({ ...detalle, Estado: 1 })) } },
    ] });
    const otro = { ...solicitud, idOperacion: '33a33333-3333-4333-8333-333333333333',
      referenciaPedido: 'OFF-OTRO', versionPedido: 2 };
    const resultados = await Promise.allSettled([caso.ejecutar(solicitud), caso.ejecutar(otro)]);
    for (let i = 0; i < resultados.length; i++) {
      if (resultados[i].status === 'rejected') await caso.ejecutar(i === 0 ? solicitud : otro);
    }
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 0);
    assert.equal((await diario.listar('comprobantes-pendientes')).length, 2);
  });
});

test('prepara en un solo lote el pedido y el cobro conservando su referencia compartida', async () => {
  await conCaja(async (caso, diario, maestros, solicitud, ruta) => {
    await new ConfirmarImpresionPedidoOffline(maestros, diario).ejecutar({
      idOperacion: '44a44444-4444-4444-8444-444444444444', idOperacionPedido: pedidoId,
      idEstacion: 5, idUsuario: 8, numeroOffline: solicitud.referenciaPedido, impresoras: ['Cocina'],
    });
    await caso.ejecutar(solicitud);
    let lote;
    const nube = { regularizar: async recibido => {
      lote = recibido;
      return { confirmado: true, id: recibido.id, resultados: recibido.operaciones.map(item => {
        if (item.operacion.tipo === 'registrar-pedido') return { idOperacion: item.id,
          numeroOffline: solicitud.referenciaPedido, idPedido: 55, nroPedido: 102, nroCuenta: 1 };
        if (item.operacion.tipo === 'registrar-cobro') return { idOperacion: item.id,
          idVenta: 77, serie: 'B001', numeroDocumento: 101 };
        return { idOperacion: item.id };
      }) };
    } };
    const resultado = await new RegularizarLoteLocal(diario, new RepositorioLotesLocales(ruta), nube,
      { tenantId: 'restaurante', identificadorEstacion: 'caja-1' }).ejecutar();
    assert.equal(resultado.operaciones, 3);
    assert.deepEqual(lote.operaciones.map(item => item.operacion.tipo), ['registrar-pedido', 'confirmar-impresion', 'registrar-cobro']);
    assert.equal(lote.operaciones[0].operacion.datos.numeroOffline, solicitud.referenciaPedido);
    assert.equal(lote.operaciones[2].operacion.datos.solicitud.referenciaPedido, solicitud.referenciaPedido);
    assert.equal(lote.operaciones[2].operacion.datos.solicitud.documento.venta.NumDocumento, 0);
  });
});

test('conserva el identificador y número de un pedido que existía antes del corte', async () => {
  await conCaja(async (caso, diario, maestros, solicitud) => {
    const snapshot = await maestros.obtener();
    snapshot.maestros.pedidos = [{ ...solicitudPedido.pedido, IdPedido: 123, NroCuenta: 1,
      NroPedido: 456, Estado: 1,
      ListaPedidoDet: solicitudPedido.pedido.ListaPedidoDet.map(detalle => ({ ...detalle, Estado: 1 })) }];
    await maestros.guardar(2, snapshot.maestros);
    await caso.ejecutar({ ...solicitud, referenciaPedido: 'ONLINE-123-1', versionPedido: 0 });
    const pedido = await diario.obtener('pedidos', 'ONLINE-123-1');
    assert.equal(pedido.IdPedido, 123);
    assert.equal(pedido.NroPedido, 456);
    assert.equal(pedido.Estado, 2);
    assert.equal((await diario.obtener('comprobantes-pendientes', pagoId)).referenciaPedido, 'ONLINE-123-1');
  });
});
