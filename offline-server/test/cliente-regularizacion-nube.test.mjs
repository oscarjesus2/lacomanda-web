import test from 'node:test';
import assert from 'node:assert/strict';
import { ClienteRegularizacionNube } from '../src/infrastructure/nube/cliente-regularizacion-nube.mjs';

const lote = { id: 'lote-1', operaciones: [{ id: 'pedido-1' }, { id: 'venta-1' }] };
const url = 'https://api.example.test/offline/regularizar';

function crear(fetchImpl, opciones = {}) {
  return new ClienteRegularizacionNube({
    url,
    obtenerToken: async () => 'token-prueba',
    fetchImpl,
    ...opciones,
  });
}

test('envía el lote completo una vez y exige la confirmación del mismo identificador', async () => {
  const llamadas = [];
  const cliente = crear(async (destino, opciones) => {
    llamadas.push({ destino, opciones });
    return new Response(JSON.stringify({ confirmado: true, id: lote.id }), { status: 200 });
  });
  assert.deepEqual(await cliente.regularizar(lote), { confirmado: true, id: lote.id });
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].destino, url);
  assert.equal(llamadas[0].opciones.method, 'POST');
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer token-prueba');
  assert.equal(llamadas[0].opciones.redirect, 'error');
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), lote);
});

test('rechaza errores HTTP, respuestas incompletas o confirmaciones de otro lote', async () => {
  for (const respuesta of [
    new Response('error', { status: 500 }),
    new Response('no es JSON', { status: 200 }),
    new Response(JSON.stringify({ confirmado: true, id: 'otro' }), { status: 200 }),
    new Response(JSON.stringify({ confirmado: false, id: lote.id }), { status: 200 }),
  ]) {
    await assert.rejects(crear(async () => respuesta).regularizar(lote));
  }
});

test('conserva las correspondencias devueltas por el backend', async () => {
  const resultados = [{ numeroOffline: 'OFF-1', idPedido: 55, nroPedido: 102 }];
  const cliente = crear(async () => new Response(JSON.stringify({ confirmado: true, id: lote.id, resultados }), { status: 200 }));
  assert.deepEqual(await cliente.regularizar(lote), { confirmado: true, id: lote.id, resultados });
});

test('comunica solo el motivo de negocio de un rechazo y limita los detalles de diagnóstico', async () => {
  for (const status of [400, 409, 422]) {
    const datos = { Message: ' El turno   ya está cerrado.\n   at Namespace.Secreto()', Data: 'dato privado',
      stackTrace: 'traza privada', headers: { Authorization: 'credencial' } };
    const cliente = crear(async () => Response.json(datos, { status, headers: { 'X-Detalle': 'privado' } }));
    await assert.rejects(cliente.regularizar(lote), { codigoHttp: status, message: 'El turno ya está cerrado.' });
  }
  const largo = crear(async () => Response.json({ title: 'A'.repeat(300) }, { status: 422 }));
  await assert.rejects(largo.regularizar(lote), { message: 'A'.repeat(239) + '…' });
  for (const json of [{ Message: 'System.InvalidOperationException: privado' }, { Data: 'privado' },
    { Message: { trace: 'privado' } }, { Message: 'A'.repeat(40000) }]) {
    await assert.rejects(crear(async () => Response.json(json, { status: 409 })).regularizar(lote),
      { message: 'La nube rechazó la solicitud para regularizar el lote (HTTP 409).' });
  }
  await assert.rejects(crear(async () => Response.json({ Message: 'detalle interno' }, { status: 500 })).regularizar(lote),
    { codigoHttp: 502, message: 'La nube rechazó la solicitud para regularizar el lote (HTTP 500).' });
});

test('no envía peticiones sin sesión válida ni datos JSON válidos', async () => {
  let llamadas = 0;
  const fetchImpl = async () => { llamadas++; throw new Error('No debe enviar'); };
  await assert.rejects(crear(fetchImpl, { obtenerToken: async () => '' }).regularizar(lote), /sesión/);
  await assert.rejects(crear(fetchImpl, { obtenerToken: async () => 'a\nb' }).regularizar(lote), /sesión/);
  await assert.rejects(crear(fetchImpl).regularizar({ ...lote, importe: NaN }), /JSON/);
  assert.equal(llamadas, 0);
});

test('propaga la pérdida de conexión para que el lote siga pendiente', async () => {
  await assert.rejects(crear(async () => { throw new Error('sin conexión'); }).regularizar(lote), { codigoHttp: 502 });
});

test('interrumpe la petición si se supera el tiempo límite', async () => {
  const cliente = crear((_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true });
  }), { tiempoLimiteMs: 15 });
  // AbortSignal.timeout usa un temporizador que no mantiene vivo el proceso.
  const mantenerPrueba = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(cliente.regularizar(lote), { codigoHttp: 504 });
  } finally {
    clearTimeout(mantenerPrueba);
  }
});

test('exige HTTPS sin credenciales en la dirección de destino', () => {
  for (const destino of ['http://api.example.test/', 'https://usuario:clave@api.example.test/', 'no es una url']) {
    assert.throws(() => crear(async () => {}, { url: destino }), /dirección/);
  }
});
