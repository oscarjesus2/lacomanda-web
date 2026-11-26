import test from 'node:test';
import assert from 'node:assert/strict';
import { ListarPedidosLocales } from '../src/application/use-cases/listar-pedidos-locales.mjs';

test('combina los pedidos originales con los cambios y nuevos pedidos locales', async () => {
  const snapshot = { maestros: { pedidos: [
    { IdPedido: 12, NroCuenta: 1, NroPedido: 45, Estado: 1 },
    { IdPedido: 12, NroCuenta: 2, NroPedido: 45, Estado: 1 },
  ] } };
  const locales = [
    { identificador: 'ONLINE-12-1', contenido: { IdPedido: 12, NroCuenta: 1, NroPedido: 45, Estado: 2 }, version: 3 },
    { identificador: 'OFF-E5-1', contenido: { NroPedidoOffline: 'OFF-E5-1', Estado: 1 }, version: 4 },
  ];
  const caso = new ListarPedidosLocales({ obtener: async () => snapshot }, { listar: async () => locales });
  const pedidos = await caso.ejecutar();
  assert.equal(pedidos.length, 3);
  assert.equal(pedidos.find(item => item.identificador === 'ONLINE-12-1').contenido.Estado, 2);
  assert.equal(pedidos.find(item => item.identificador === 'ONLINE-12-2').version, 0);
  assert.equal(pedidos.find(item => item.identificador === 'OFF-E5-1').version, 4);
  pedidos.find(item => item.identificador === 'ONLINE-12-2').contenido.Estado = 99;
  assert.equal(snapshot.maestros.pedidos[1].Estado, 1);
});

test('rechaza una instantánea sin pedidos o con cuentas duplicadas', async () => {
  const diario = { listar: async () => [] };
  await assert.rejects(new ListarPedidosLocales({ obtener: async () => ({ maestros: {} }) }, diario).ejecutar(), /no está preparada/);
  const cuenta = { IdPedido: 12, NroCuenta: 1 };
  await assert.rejects(new ListarPedidosLocales({ obtener: async () => ({ maestros: { pedidos: [cuenta, cuenta] } }) }, diario)
    .ejecutar(), /repetidas/);
});
