import test from 'node:test';
import assert from 'node:assert/strict';
import { PrepararComandaOffline } from '../src/application/use-cases/preparar-comanda-offline.mjs';

const base = {
  area: 'COCINA', numeroPedido: 'OFF-E5-123', idCanalVenta: 2,
  mesa: 'Mesa 4', ambiente: 'Salón', fechaLocal: '24/11/2026 14:00:00',
  idCaja: 1, usuario: 'Ana', estacion: 'CAJA', etiquetaMozo: 'MOZO', mozo: 'Luis', personas: 2,
  lineas: [{ descripcion: 'Pollo', cantidad: 1 }, { descripcion: 'Pollo', cantidad: 2 },
    { descripcion: 'Pollo', cantidad: 1, observacion: 'Sin sal' }],
};

test('prepara los datos principales y agrupa solo los productos sin observaciones', () => {
  const html = new PrepararComandaOffline().ejecutar(base);
  assert.match(html, /COCINA/);
  assert.match(html, /MESA 4 - SALÓN/);
  assert.match(html, /OFF-E5-123/);
  assert.match(html, /PERSONAS/);
  assert.match(html, /<td class="cantidad">3<\/td>/);
  assert.equal((html.match(/<strong>Pollo<\/strong>/g) ?? []).length, 2);
  assert.match(html, /OBS\.: Sin sal/);
  assert.match(html, /CAJA 1 \/ Ana/);
});

test('usa el destino y los símbolos de la cultura de la estación', () => {
  const html = new PrepararComandaOffline().ejecutar({ ...base, idCanalVenta: 4, cultura: 'es-ES',
    lineas: [{ descripcion: 'Agua', cantidad: 1.5 }] });
  assert.match(html, /<h2>DELIVERY<\/h2>/);
  assert.match(html, /<td class="cantidad">1,5<\/td>/);
});

test('escapa datos del pedido para que no se interpreten como HTML', () => {
  const html = new PrepararComandaOffline().ejecutar({ ...base, cliente: '<script>alert(1)</script>',
    lineas: [{ descripcion: 'Sopa & arroz', cantidad: 1, observacion: '<img src=x>' }] });
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Sopa &amp; arroz/);
  assert.match(html, /&lt;img src=x&gt;/);
});

test('rechaza tickets incompletos y cantidades inválidas', () => {
  const caso = new PrepararComandaOffline();
  assert.throws(() => caso.ejecutar({ ...base, lineas: [] }), /comanda/);
  assert.throws(() => caso.ejecutar({ ...base, lineas: [{ descripcion: 'Agua', cantidad: NaN }] }), /línea/);
  assert.throws(() => caso.ejecutar({ ...base, cultura: 'no_es_una_cultura' }), /cultura/);
  assert.throws(() => caso.ejecutar({ ...base, lineas: [
    { descripcion: 'Agua', cantidad: 1e308 }, { descripcion: 'Agua', cantidad: 1e308 },
  ] }), /cantidad/);
});
