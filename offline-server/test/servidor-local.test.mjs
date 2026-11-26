import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { clienteHttpDePrueba } from '../test-support/http-en-memoria.mjs';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';
import { ObtenerMaestroLocal } from '../src/application/use-cases/obtener-maestro-local.mjs';
import { crearServidorLocal } from '../src/interfaces/http/crear-servidor-local.mjs';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { ListarUsuariosOffline } from '../src/application/use-cases/listar-usuarios-offline.mjs';
import { RegistrarNuevoPedidoOffline } from '../src/application/use-cases/registrar-nuevo-pedido-offline.mjs';
import { RegistrarCobroPendienteOffline } from '../src/application/use-cases/registrar-cobro-pendiente-offline.mjs';
import { ConfirmarImpresionPedidoOffline } from '../src/application/use-cases/confirmar-impresion-pedido-offline.mjs';
import { PrepararComandaOffline } from '../src/application/use-cases/preparar-comanda-offline.mjs';

test('expone los maestros guardados en caja sin habilitar todavía el modo operativo', async () => {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-servidor-test-'));
  const repositorio = new RepositorioMaestrosLocales(directorio);
  const servidor = crearServidorLocal({
    obtenerMaestroLocal: new ObtenerMaestroLocal(repositorio),
    origenesPermitidos: ['https://app.example'],
  });
  try {
    const fetch = clienteHttpDePrueba(servidor);
    const base = `http://127.0.0.1:17861`;
    const estado = await (await fetch(`${base}/api/estado`)).json();
    assert.equal(estado.disponible, false);
    assert.equal(estado.regularizacionPendiente, true);
    const permitido = { headers: { Origin: 'https://app.example' } };
    assert.equal((await fetch(`${base}/api/maestros/productos`)).status, 403);
    assert.equal((await fetch(`${base}/api/maestros/productos`, permitido)).status, 503);
    await repositorio.guardar(1, { productos: [{ id: 7 }], mesas: [{ id: 5 }] });
    const respuesta = await fetch(`${base}/api/maestros/productos`, { headers: { Origin: 'https://app.example' } });
    assert.equal(respuesta.headers.get('access-control-allow-origin'), 'https://app.example');
    assert.deepEqual(await respuesta.json(), { version: 1, datos: [{ id: 7 }] });
    assert.equal((await fetch(`${base}/api/maestros/mesas`, { headers: { Origin: 'https://otro.example' } })).status, 403);
    assert.equal((await fetch(`${base}/api/maestros/usuarios`, permitido)).status, 404);
    assert.equal((await fetch(`${base}/api/maestros/productos`, { method: 'POST', ...permitido })).status, 405);
    assert.equal((await fetch(`${base}/api/pedidos`, { method: 'POST', headers: {
      Origin: 'https://app.example', 'Content-Type': 'application/json',
    }, body: '{}' })).status, 503);
    assert.equal((await fetch(`${base}/api/impresiones/progreso`, { method: 'POST', headers: {
      Origin: 'https://app.example', 'Content-Type': 'application/json',
    }, body: '{}' })).status, 503);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
});

test('en pruebas integra las peticiones de pedido y cobro con los ficheros de caja', async () => {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-api-test-'));
  const maestros = new RepositorioMaestrosLocales(directorio);
  const diario = new DiarioTransaccionalLocal(directorio);
  const servidor = crearServidorLocal({
    obtenerMaestroLocal: new ObtenerMaestroLocal(maestros, diario),
    registrarPedido: new RegistrarNuevoPedidoOffline(maestros, diario),
    registrarCobro: new RegistrarCobroPendienteOffline(maestros, diario),
    prepararComanda: new PrepararComandaOffline(),
    confirmarImpresion: new ConfirmarImpresionPedidoOffline(maestros, diario),
    diario,
    habilitarOperaciones: true,
    origenesPermitidos: ['https://app.example'],
  });
  try {
    await maestros.guardar(1, { productos: [{ IdProducto: 4, Activo: true }], pedidos: [],
      cajas: [{ IdCaja: 1 }], turnos: [{ IdTurno: 2, IdCaja: 1, Estado: 1 }],
      mesas: [{ IdEspacio: 7, Activo: true, Ocupado: 0 }],
      usuarios: [{ IdUsuario: 8, IdEmpleado: 3, NombreUsuario: 'Ana', Activo: true, IdNivel: 2 }] });
    const fetch = clienteHttpDePrueba(servidor);
    const base = `http://127.0.0.1:17861`;
    const headers = { Origin: 'https://app.example', 'Content-Type': 'application/json' };
    const preflight = await fetch(`${base}/api/pedidos`, { method: 'OPTIONS', headers: {
      Origin: 'https://app.example', 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Private-Network': 'true',
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
    const solicitudPedido = { idOperacion: '11a11111-1111-4111-8111-111111111111', idEstacion: 5, idUsuario: 8,
      pedido: { IdPedido: 0, NroCuenta: 1, IdCaja: 1, IdTurno: 2, IdEmpleado: 3, IdCanalVenta: 2,
        IdEspacio: 7, Total: 20, ListaPedidoDet: [
          { IdPedido: 0, Producto: { IdProducto: 4 }, Cantidad: 2, Precio: 10, Subtotal: 20 },
        ] } };
    const grabado = await fetch(`${base}/api/pedidos`, { method: 'POST', headers, body: JSON.stringify(solicitudPedido) });
    assert.equal(grabado.status, 200);
    const { numeroOffline } = await grabado.json();
    const comanda = { area: 'COCINA', numeroPedido: numeroOffline, idCanalVenta: 2,
      mesa: 'Mesa 4', fechaLocal: '24/11/2026 14:00:00', idCaja: 1, usuario: 'Ana',
      estacion: 'CAJA', etiquetaMozo: 'MOZO', mozo: 'Ana', lineas: [{ descripcion: 'Pollo', cantidad: 2 }] };
    const preparada = await fetch(`${base}/api/impresiones/preparar`, { method: 'POST', headers, body: JSON.stringify(comanda) });
    assert.equal(preparada.status, 200);
    assert.match(await preparada.json(), /COCINA/);
    const impresion = { idOperacion: '33a33333-3333-4333-8333-333333333333',
      idOperacionPedido: solicitudPedido.idOperacion, idEstacion: 5, idUsuario: 8,
      numeroOffline, impresoras: ['COCINA'] };
    const confirmada = await fetch(`${base}/api/impresiones/confirmar`, { method: 'POST', headers, body: JSON.stringify(impresion) });
    assert.equal(confirmada.status, 200);
    const cobro = { idOperacion: '22a22222-2222-4222-8222-222222222222', idEstacion: 5, idUsuario: 8,
      referenciaPedido: numeroOffline, versionPedido: 1, correoComprobante: 'cliente@example.test',
      documento: { usarClienteGenerico: true, cliente: null,
        venta: { IdTipoDocumento: 2, IdCaja: 1, Importe: 20, Total: 20, Propina: 0, NumDocumento: 0, Serie: '' },
        listaPago: [{ IdTipoPago: 1, MontoPagado: 20, Vuelto: 0, Propina: 0 }] } };
    const guardado = await fetch(`${base}/api/cobros`, { method: 'POST', headers, body: JSON.stringify(cobro) });
    assert.equal(guardado.status, 200);
    assert.equal((await diario.obtener('pedidos', numeroOffline)).Estado, 2);
    assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 0);
    assert.equal((await diario.obtener('comprobantes-pendientes', cobro.idOperacion)).documento.venta.NumDocumento, 0);
    assert.equal((await fetch(`${base}/api/pedidos`, { method: 'POST', headers, body: '{' })).status, 400);
    assert.equal((await fetch(`${base}/api/pedidos`, { method: 'POST', headers: { Origin: 'https://otro.example',
      'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await fetch(`${base}/api/pedidos`, { method: 'POST', headers, body: JSON.stringify({
      texto: 'a'.repeat(1024 * 1024),
    }) })).status, 413);
    assert.equal((await (await fetch(`${base}/api/estado`)).json()).disponible, false);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
});

test('consulta usuarios y pedidos guardados en caja sin habilitar todavía el modo operativo', async () => {
  const raizTemporal = resolve(tmpdir());
  const directorio = await mkdtemp(join(raizTemporal, 'lacomanda-servidor-test-'));
  const repositorio = new RepositorioMaestrosLocales(directorio);
  const diario = new DiarioTransaccionalLocal(directorio);
  const servidor = crearServidorLocal({
    obtenerMaestroLocal: new ObtenerMaestroLocal(repositorio, diario),
    listarUsuariosOffline: new ListarUsuariosOffline(repositorio),
    diario,
    origenesPermitidos: ['https://app.example'],
  });
  try {
    await repositorio.guardar(1, {
      productos: [], mesas: [], usuarios: [
        { IdUsuario: 1, NombreUsuario: 'Ana', Activo: true, IdNivel: 2, Token: 'secreto', PuedeCerrarTurno: true },
        { IdUsuario: 2, NombreUsuario: 'Inactivo', Activo: false, IdNivel: 2 },
      ],
    });
    await diario.aplicar({ id: 'op-1', cambios: [
      { tipo: 'pedidos', identificador: 'OFF-1', contenido: { total: 15 } },
    ] });
    const fetch = clienteHttpDePrueba(servidor);
    const base = `http://127.0.0.1:17861`;
    const opciones = { headers: { Origin: 'https://app.example' } };
    const usuarios = await (await fetch(`${base}/api/usuarios`, opciones)).json();
    assert.equal(usuarios.length, 1);
    assert.equal(usuarios[0].NombreUsuario, 'Ana');
    assert.equal(usuarios[0].PuedeCerrarTurno, false);
    assert.equal('Token' in usuarios[0], false);
    assert.deepEqual(await (await fetch(`${base}/api/usuarios/1`, opciones)).json(), usuarios[0]);
    assert.equal((await fetch(`${base}/api/usuarios/2`, opciones)).status, 404);
    assert.deepEqual(await (await fetch(`${base}/api/pedidos`, opciones)).json(), [
      { identificador: 'OFF-1', contenido: { total: 15 }, version: 1 },
    ]);
    assert.deepEqual(await (await fetch(`${base}/api/pedidos/OFF-1`, opciones)).json(), {
      contenido: { total: 15 }, version: 1,
    });
    assert.equal((await fetch(`${base}/api/pedidos/OFF-2`, opciones)).status, 404);
    assert.equal((await fetch(`${base}/api/usuarios`, { headers: { Origin: 'https://otro.example' } })).status, 403);
    assert.equal((await (await fetch(`${base}/api/estado`, opciones)).json()).disponible, false);
  } finally {
    if (!resolve(directorio).startsWith(raizTemporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
});

test('un fallo de almacenamiento se comunica como error y no como conflicto de pedido', async () => {
  const servidor = crearServidorLocal({
    obtenerMaestroLocal: {}, habilitarOperaciones: true, origenesPermitidos: ['https://app.example'],
    registrarPedido: { ejecutar: async () => {
      const error = new Error('espacio agotado');
      error.code = 'ENOSPC';
      throw error;
    } },
  });
  const fetch = clienteHttpDePrueba(servidor);
  const respuesta = await fetch(`http://127.0.0.1:17861/api/pedidos`, {
    method: 'POST', headers: { Origin: 'https://app.example', 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(respuesta.status, 500);
  assert.match((await respuesta.json()).mensaje, /guardar/);
});
