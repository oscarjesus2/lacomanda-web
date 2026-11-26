import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { clienteHttpDePrueba } from '../test-support/http-en-memoria.mjs';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';
import { RepositorioProgresoImpresion } from '../src/infrastructure/archivos/repositorio-progreso-impresion.mjs';
import { RegistrarNuevoPedidoOffline } from '../src/application/use-cases/registrar-nuevo-pedido-offline.mjs';
import { ConfirmarImpresionPedidoOffline } from '../src/application/use-cases/confirmar-impresion-pedido-offline.mjs';
import { GestionarProgresoImpresionOffline } from '../src/application/use-cases/gestionar-progreso-impresion-offline.mjs';
import { ListarImpresionesPendientesOffline } from '../src/application/use-cases/listar-impresiones-pendientes-offline.mjs';
import { crearServidorLocal } from '../src/interfaces/http/crear-servidor-local.mjs';

const idPedido = '11a11111-1111-4111-8111-111111111111';
const idConfirmacion = '22a22222-2222-4222-8222-222222222222';
const intento = '33a33333-3333-4333-8333-333333333333';
const otroIntento = '44a44444-4444-4444-8444-444444444444';

async function conCaja(prueba) {
  const raiz = resolve(tmpdir());
  const directorio = await mkdtemp(join(raiz, 'lacomanda-progreso-test-'));
  try {
    const maestros = new RepositorioMaestrosLocales(directorio);
    const diario = new DiarioTransaccionalLocal(directorio);
    const progreso = new RepositorioProgresoImpresion(directorio);
    await maestros.guardar(1, { productos: [{ IdProducto: 4, Activo: true }], pedidos: [],
      cajas: [{ IdCaja: 1 }], turnos: [{ IdTurno: 2, IdCaja: 1, Estado: 1 }],
      mesas: [{ IdEspacio: 7, Activo: true, Ocupado: 0 }],
      usuarios: [{ IdUsuario: 8, NombreUsuario: 'Ana', Activo: true, IdNivel: 2, IdEmpleado: 3 }] });
    const pedido = await new RegistrarNuevoPedidoOffline(maestros, diario).ejecutar({
      idOperacion: idPedido, idEstacion: 5, idUsuario: 8,
      pedido: { IdPedido: 0, NroCuenta: 1, IdCaja: 1, IdTurno: 2, IdEmpleado: 3, IdCanalVenta: 2,
        IdEspacio: 7, ListaPedidoDet: [{ IdPedido: 0, Producto: { IdProducto: 4 }, Cantidad: 2, Precio: 10, Subtotal: 20 }] },
    });
    const identidad = { idOperacion: idConfirmacion, idOperacionPedido: idPedido,
      idEstacion: 5, idUsuario: 8, numeroOffline: pedido.numeroOffline };
    const comanda = { area: 'COCINA', numeroPedido: pedido.numeroOffline, idCanalVenta: 2,
      fechaUtc: '2026-11-24T14:00:00.000Z', idCaja: 1, usuario: 'Ana', estacion: 'CAJA',
      etiquetaMozo: 'MOZO', mozo: 'Ana', lineas: [{ descripcion: 'Pollo', cantidad: 2 }] };
    const crear = { accion: 'crear', ...identidad, trabajos: [
      { impresora: 'Cocina', datos: comanda }, { impresora: 'Bar', datos: { ...comanda, area: 'BAR' } },
    ] };
    const caso = new GestionarProgresoImpresionOffline(maestros, diario, progreso);
    await prueba({ caso, crear, identidad, diario, maestros, progreso, directorio });
  } finally {
    if (!resolve(directorio).startsWith(raiz + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
}

test('conserva el avance y exige revisar una impresión interrumpida tras reiniciar', async () => {
  await conCaja(async ({ caso, crear, identidad, diario, maestros, directorio }) => {
    await caso.ejecutar(crear);
    await caso.ejecutar({ ...identidad, accion: 'iniciar', indice: 0, idIntento: intento });
    await caso.ejecutar({ ...identidad, accion: 'aceptar', indice: 0, idIntento: intento });
    await caso.ejecutar({ ...identidad, accion: 'iniciar', indice: 1, idIntento: otroIntento });
    const repoReiniciado = new RepositorioProgresoImpresion(directorio);
    const reiniciado = new GestionarProgresoImpresionOffline(maestros, diario, repoReiniciado);
    const estado = await reiniciado.ejecutar({ ...identidad, accion: 'consultar' });
    assert.deepEqual(estado.estados.map(item => item.estado), ['aceptada', 'enviando']);
    await assert.rejects(reiniciado.ejecutar({ ...identidad, accion: 'iniciar', indice: 1, idIntento: intento }), /revise/);
    const confirmar = new ConfirmarImpresionPedidoOffline(maestros, diario, repoReiniciado);
    const pendientes = new ListarImpresionesPendientesOffline(maestros, diario, repoReiniciado);
    assert.equal((await pendientes.ejecutar({ idEstacion: 5, idUsuario: 8 })).length, 1);
    assert.equal((await pendientes.ejecutar({ idEstacion: 6, idUsuario: 8 })).length, 0);
    await assert.rejects(pendientes.ejecutar({ idEstacion: 5, idUsuario: 9 }), /usuario/);
    const confirmacion = { ...identidad, impresoras: ['Cocina', 'Bar'] };
    await assert.rejects(confirmar.ejecutar(confirmacion), /no está confirmada/);
    await reiniciado.ejecutar({ ...identidad, accion: 'resolver', indice: 1, idIntento: otroIntento, decision: 'impresa' });
    assert.equal((await confirmar.ejecutar(confirmacion)).resultado, 'registrada');
    assert.equal((await confirmar.ejecutar(confirmacion)).resultado, 'existente');
    assert.equal((await pendientes.ejecutar({ idEstacion: 5, idUsuario: 8 })).length, 0);
  });
});

test('permite decidir la reimpresión sin modificar las comandas ya aceptadas', async () => {
  await conCaja(async ({ caso, crear, identidad }) => {
    await caso.ejecutar(crear);
    await caso.ejecutar({ ...identidad, accion: 'iniciar', indice: 0, idIntento: intento });
    await caso.ejecutar({ ...identidad, accion: 'resolver', indice: 0, idIntento: intento, decision: 'reimprimir' });
    await caso.ejecutar({ ...identidad, accion: 'iniciar', indice: 0, idIntento: otroIntento });
    await caso.ejecutar({ ...identidad, accion: 'aceptar', indice: 0, idIntento: otroIntento });
    const resultado = await caso.ejecutar({ ...identidad, accion: 'aceptar', indice: 0, idIntento: otroIntento });
    assert.equal(resultado.estados[0].estado, 'aceptada');
    assert.deepEqual(resultado.estados[0].historial.map(item => item.accion), ['iniciar', 'resolver', 'iniciar', 'aceptar']);
    assert.equal(resultado.estados[0].historial[1].decision, 'reimprimir');
    assert.ok(resultado.estados[0].historial.every(item => /Z$/.test(item.fechaUtc)));
  });
});

test('evita que dos estaciones envíen simultáneamente la misma comanda', async () => {
  await conCaja(async ({ caso, crear, identidad }) => {
    await caso.ejecutar(crear);
    const resultados = await Promise.allSettled([
      caso.ejecutar({ ...identidad, accion: 'iniciar', indice: 0, idIntento: intento }),
      caso.ejecutar({ ...identidad, accion: 'iniciar', indice: 0, idIntento: otroIntento }),
    ]);
    assert.equal(resultados.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(resultados.filter(item => item.status === 'rejected').length, 1);
    await assert.rejects(caso.ejecutar({ ...crear, trabajos: [crear.trabajos[1]] }), /otro plan/);
    await assert.rejects(caso.ejecutar({ ...identidad, accion: 'consultar', idUsuario: 9 }), /no se encontró/i);
  });
});

test('rechaza planes y confirmaciones que no corresponden al pedido o sus impresoras', async () => {
  await conCaja(async ({ caso, crear, identidad, diario, maestros, progreso }) => {
    await assert.rejects(caso.ejecutar({ ...crear, trabajos: [{ ...crear.trabajos[0],
      datos: { ...crear.trabajos[0].datos, numeroPedido: 'otro' } }] }), /no corresponde/);
    await assert.rejects(caso.ejecutar({ ...crear, idOperacion: idPedido.toUpperCase() }), /distinto/);
    await assert.rejects(caso.ejecutar({ ...crear, trabajos: [{ ...crear.trabajos[0],
      datos: { ...crear.trabajos[0].datos, fechaUtc: '2026-11-24T14:00:00+01:00' } }] }), /UTC/);
    await assert.rejects(caso.ejecutar({ ...crear, trabajos: [{ ...crear.trabajos[0],
      datos: { ...crear.trabajos[0].datos, fechaLocal: '24/11/2026' } }] }), /UTC/);
    await caso.ejecutar(crear);
    for (const [indice, idIntento] of [intento, otroIntento].entries()) {
      await caso.ejecutar({ ...identidad, accion: 'iniciar', indice, idIntento });
      await caso.ejecutar({ ...identidad, accion: 'aceptar', indice, idIntento });
    }
    const confirmar = new ConfirmarImpresionPedidoOffline(maestros, diario, progreso);
    await assert.rejects(confirmar.ejecutar({ ...identidad, impresoras: ['Cocina'] }), /no está confirmada/);
    assert.equal((await diario.listarDesde(0)).length, 1);
  });
});

test('la API local confirma solo después de registrar todas las impresiones en caja', async () => {
  await conCaja(async ({ caso, crear, identidad, diario, maestros, progreso }) => {
    const servidor = crearServidorLocal({ diario, progresoImpresion: caso,
      confirmarImpresion: new ConfirmarImpresionPedidoOffline(maestros, diario, progreso),
      listarImpresionesPendientes: new ListarImpresionesPendientesOffline(maestros, diario, progreso),
      habilitarOperaciones: true, origenesPermitidos: ['https://app.example'] });
    const fetch = clienteHttpDePrueba(servidor);
    const base = 'http://127.0.0.1:17861';
    const post = (ruta, datos) => fetch(`${base}${ruta}`, { method: 'POST',
      headers: { Origin: 'https://app.example', 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    assert.equal((await post('/api/impresiones/progreso', crear)).status, 200);
    const pendientes = await post('/api/impresiones/pendientes', { idEstacion: 5, idUsuario: 8 });
    assert.equal((await pendientes.json()).length, 1);
    const confirmacion = { ...identidad, impresoras: ['Cocina', 'Bar'] };
    assert.equal((await post('/api/impresiones/confirmar', confirmacion)).status, 409);
    for (const [indice, idIntento] of [intento, otroIntento].entries()) {
      assert.equal((await post('/api/impresiones/progreso', { ...identidad, accion: 'iniciar', indice, idIntento })).status, 200);
      assert.equal((await post('/api/impresiones/progreso', { ...identidad, accion: 'aceptar', indice, idIntento })).status, 200);
    }
    const respuesta = await post('/api/impresiones/confirmar', confirmacion);
    assert.equal(respuesta.status, 200);
    assert.equal((await respuesta.json()).resultado, 'registrada');
    assert.equal((await (await post('/api/impresiones/pendientes', { idEstacion: 5, idUsuario: 8 })).json()).length, 0);
    assert.equal((await diario.listarDesde(0)).length, 2);
  });
});
