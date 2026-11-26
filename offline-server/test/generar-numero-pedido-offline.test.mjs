import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { GenerarNumeroPedidoOffline } from '../src/application/use-cases/generar-numero-pedido-offline.mjs';

test('genera una referencia estable por operación sin utilizar el correlativo oficial', () => {
  const caso = new GenerarNumeroPedidoOffline();
  const operacion = randomUUID();
  const referencia = caso.ejecutar(12, operacion);
  assert.equal(referencia, `OFF-E12-${operacion}`);
  assert.equal(caso.ejecutar(12, operacion.toUpperCase()), referencia);
  assert.notEqual(caso.ejecutar(13, operacion), referencia);
  assert.notEqual(caso.ejecutar(12, randomUUID()), referencia);
});

test('rechaza estaciones e identificadores incompletos', () => {
  const caso = new GenerarNumeroPedidoOffline();
  assert.throws(() => caso.ejecutar(0, randomUUID()), /estación/);
  assert.throws(() => caso.ejecutar(1, '123'), /UUID/);
});
