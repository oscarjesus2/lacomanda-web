import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { RepositorioMaestrosLocales } from '../src/infrastructure/archivos/repositorio-maestros-locales.mjs';
import { DiarioTransaccionalLocal } from '../src/infrastructure/archivos/diario-transaccional-local.mjs';
import { RepositorioProgresoImpresion } from '../src/infrastructure/archivos/repositorio-progreso-impresion.mjs';
import { ModificarPedidoOffline } from '../src/application/use-cases/modificar-pedido-offline.mjs';
import { RegistrarNuevoPedidoOffline } from '../src/application/use-cases/registrar-nuevo-pedido-offline.mjs';
import { RegistrarCobroPendienteOffline } from '../src/application/use-cases/registrar-cobro-pendiente-offline.mjs';
import { ListarImpresionesPendientesOffline } from '../src/application/use-cases/listar-impresiones-pendientes-offline.mjs';
import { GestionarProgresoImpresionOffline } from '../src/application/use-cases/gestionar-progreso-impresion-offline.mjs';
import { ConfirmarImpresionPedidoOffline } from '../src/application/use-cases/confirmar-impresion-pedido-offline.mjs';
import { ObtenerPedidoLocal } from '../src/application/use-cases/obtener-pedido-local.mjs';
import { ObtenerMaestroLocal } from '../src/application/use-cases/obtener-maestro-local.mjs';
import { SincronizarMaestrosLocales } from '../src/application/use-cases/sincronizar-maestros-locales.mjs';
import { ListarPedidosLocales } from '../src/application/use-cases/listar-pedidos-locales.mjs';
import { RepositorioLotesLocales } from '../src/infrastructure/archivos/repositorio-lotes-locales.mjs';
import { RegularizarLoteLocal } from '../src/application/use-cases/regularizar-lote-local.mjs';
import { validarOperacionesRegularizables } from '../src/application/validators/validar-operaciones-regularizables.mjs';

const detalle = { IdPedido: 0, Producto: { IdProducto: 9 }, Cantidad: 1, Precio: 10, Subtotal: 10 };
const cabecera = { IdCanalVenta: 2, IdEspacio: 2, IdCaja: 3, IdTurno: 4, IdEmpleado: 12, NroCuenta: 1 };

async function conCaja(t, pedidos = []) {
  const temporal = resolve(tmpdir());
  const ruta = await mkdtemp(join(temporal, 'lacomanda-modificar-'));
  t.after(async () => {
    if (!resolve(ruta).startsWith(temporal + sep)) throw new Error('Ruta temporal no válida.');
    await rm(ruta, { recursive: true, force: true });
  });
  const diario = new DiarioTransaccionalLocal(ruta);
  const maestros = new RepositorioMaestrosLocales(ruta);
  const progreso = new RepositorioProgresoImpresion(ruta);
  await maestros.guardar(1, {
    usuarios: [{ IdUsuario: 1, IdEmpleado: 12, IdNivel: 1, NombreUsuario: 'Caja', Activo: true },
      { IdUsuario: 2, IdEmpleado: 13, IdNivel: 3, NombreUsuario: 'Sala', Activo: true }],
    cajas: [{ IdCaja: 3 }], turnos: [{ IdCaja: 3, IdTurno: 4, Estado: 1 }],
    mesas: [{ IdEspacio: 2, Activo: true, Ocupado: pedidos.length ? 1 : 0 }],
    productos: [{ IdProducto: 9, Activo: true, NombreCompleto: 'Café', Precio: 10, AreasImpresion: [1, 2] }],
    areas: [{ IdAreaImpresion: 1, Descripcion: 'Cocina', NombreImpresora: 'Principal' },
      { IdAreaImpresion: 2, Descripcion: 'Bar', NombreImpresora: 'Principal' }],
    descuentos: [{ IdDescuento: 6, Activo: true, TipoDescuento: 2, Porcentaje: 15 }], pedidos,
  });
  return { ruta, diario, maestros, progreso, modificar: new ModificarPedidoOffline(maestros, diario, progreso) };
}

const actor = { idEstacion: 3, idUsuario: 1 };
function peticion(accion, versionPedido, extra) {
  return { ...actor, idOperacion: randomUUID(), referenciaPedido: 'ONLINE-18-1', versionPedido, accion, ...extra };
}
function existente() {
  return { ...cabecera, IdPedido: 18, Estado: 1, UltimoItem: 7, UltimaCuenta: 3,
    ListaPedidoDet: [{ ...detalle, Item: 1, Estado: 1 }, { ...detalle, Item: 3, Estado: 1 }] };
}

test('abre una mesa, cobra una cuenta dividida y la libera al anular la cuenta restante', async t => {
  const { maestros, diario, progreso, modificar } = await conCaja(t);
  const abrir = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  const pedido = { ...cabecera, IdPedido: 0, ListaPedidoDet: [detalle, detalle] };
  const solicitud = { ...actor, idOperacion: randomUUID(), pedido };
  await assert.rejects(abrir.ejecutar({ ...solicitud, pedido: { ...pedido, Total: 0.01 } }), /total/i);
  const { numeroOffline } = await abrir.ejecutar(solicitud);
  assert.equal((await diario.obtener('pedidos', numeroOffline)).Total, 20);
  const { referenciaDestino } = await modificar.ejecutar(peticion('dividir', 1, { referenciaPedido: numeroOffline, items: [2] }));
  const cobrar = new RegistrarCobroPendienteOffline(maestros, diario);
  const cobro = { ...actor, idOperacion: randomUUID(), referenciaPedido: referenciaDestino, versionPedido: 2,
    documento: { usarClienteGenerico: true, venta: { IdTipoDocumento: 9, IdCaja: 3, Importe: 10, Total: 10, Propina: 0 },
      listaPago: [{ IdTipoPago: 1, MontoPagado: 10, Vuelto: 0, Propina: 0 }] } };
  await assert.rejects(cobrar.ejecutar({ ...cobro, idUsuario: 2 }), /usuario/);
  await cobrar.ejecutar(cobro);
  assert.equal((await diario.obtener('pedidos', referenciaDestino)).ListaPedidoDet[0].Estado, 2);
  assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
  const reabrir = { ...solicitud, idOperacion: randomUUID() };
  await assert.rejects(abrir.ejecutar(reabrir), /ocupada/);
  await modificar.ejecutar(peticion('anular-pedido', 2, { referenciaPedido: numeroOffline, motivo: 'Cancelación' }));
  assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 0);
  assert.equal((await abrir.ejecutar(reabrir)).resultado, 'registrada');
});

test('divide, modifica y anula cuentas conservando el origen y la numeración global del pedido', async t => {
  const { diario, maestros, modificar } = await conCaja(t, [existente()]);
  const dividir = peticion('dividir', 0, { items: [3] });
  assert.equal((await modificar.ejecutar(dividir)).referenciaDestino, 'ONLINE-18-4');
  assert.equal((await modificar.ejecutar(dividir)).resultado, 'existente');
  await assert.rejects(modificar.ejecutar({ ...dividir, items: [1] }), /otros datos/);
  const operacion = (await diario.listarDesde(0))[0];
  assert.deepEqual(operacion.operacion.datos.previo.ListaPedidoDet.map(item => item.Item), [1, 3]);
  assert.equal(operacion.operacion.datos.nroCuentaDestino, 4);
  const agregar = await modificar.ejecutar(peticion('agregar-productos', 1, { referenciaPedido: 'ONLINE-18-4', detalles: [detalle] }));
  assert.deepEqual(agregar.plan.trabajos.map(item => item.datos.area), ['Cocina', 'Bar']);
  const destino = await new ObtenerPedidoLocal(maestros, diario).ejecutar('ONLINE-18-4');
  assert.deepEqual(destino.contenido.ListaPedidoDet.map(item => item.Item), [3, 8]);
  assert.equal(destino.contenido.Total, 20);
  await modificar.ejecutar(peticion('descuento', 2, { referenciaPedido: 'ONLINE-18-4', idDescuento: 6, porcentaje: 15 }));
  assert.equal((await diario.listarDesde(2))[0].operacion.datos.porcentajeAplicado, 15);
  assert.equal((await diario.obtener('pedidos', 'ONLINE-18-4')).Total, 17);
  const anular = await modificar.ejecutar(peticion('anular-producto', 1, { item: 1, motivo: 'Duplicado' }));
  assert.equal(anular.plan.trabajos[0].datos.area, 'ANULACIÓN - Cocina');
  assert.equal((await diario.obtener('pedidos', 'ONLINE-18-1')).Estado, 3);
  assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 1);
  await modificar.ejecutar(peticion('anular-pedido', 3, { referenciaPedido: 'ONLINE-18-4', motivo: 'Cancelado' }));
  assert.equal((await diario.obtener('estado-local', 'mesas')).datos[0].Ocupado, 0);
});

test('rechaza autorizaciones ajenas, cambios en paralelo y descuentos que difieran de los maestros', async t => {
  const { modificar, diario } = await conCaja(t, [existente()]);
  for (const extra of [{ idUsuario: 2 }, { idUsuario: 2, idAutorizador: 1 }, { porcentaje: 99 }]) {
    await assert.rejects(modificar.ejecutar(peticion('descuento', 0, { idDescuento: 6, ...extra })));
  }
  await assert.rejects(modificar.ejecutar(peticion('dividir', 0, { items: [1, 3] })), /conservar/);
  await assert.rejects(modificar.ejecutar(peticion('anular-pedido', 0, { idUsuario: 2, motivo: 'Corrección' })), /autorizado/);
  const cambios = await Promise.allSettled([1, 3].map(item => modificar.ejecutar(peticion('anular-producto', 0, { item, motivo: 'Duplicado' }))));
  assert.equal(cambios.filter(cambio => cambio.status === 'fulfilled').length, 1);
  assert.equal((await diario.listarDesde(0)).length, 1);
});

test('valida selecciones de menú y cupos de complementos, y envía cada subproducto a su área', async t => {
  const { maestros, diario, progreso } = await conCaja(t);
  const copia = await maestros.obtener();
  const cafe = copia.maestros.productos[0];
  copia.maestros.productos.push(
    { ...cafe, IdProducto: 10, Tipo: 1, IdSeccionMenu: 0, NombreCompleto: 'Menú del día', AreasImpresion: [],
      SeccionesMenu: [{ IdSeccionMenu: 5, Opciones: [11], EsOpcional: false, Cantidad: 1 }] },
    { ...cafe, IdProducto: 11, Tipo: 1, IdSeccionMenu: 5, VentaIndividual: false, NombreCompleto: 'Sopa', AreasImpresion: [1] },
    { ...cafe, IdProducto: 12, Tipo: 2, Qty: 2, NombreCompleto: 'Hamburguesa', AreasImpresion: [1] },
    { ...cafe, IdProducto: 13, Tipo: 3, FactorComplemento: 2, NombreCompleto: 'Bebida', AreasImpresion: [2] },
  );
  await maestros.guardar(2, copia.maestros);
  const nuevo = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  const menu = { ...detalle, Producto: { IdProducto: 10 }, PedidoMenu: [{ IdProductoSeccionMenu: 11, IdSeccionMenu: 5, Cantidad: 1, Observacion: 'Sin sal' }] };
  const extra = { IdProdComple: 13, ProductoComplemento: { IdProducto: 13, FactorComplemento: 2 }, Cantidad: 1 };
  const combo = { ...detalle, Producto: { IdProducto: 12 }, PedidoComplemento: [extra] };
  const pedido = (lineas) => ({ ...actor, idOperacion: randomUUID(), pedido: { ...cabecera, IdPedido: 0, ListaPedidoDet: lineas } });
  await assert.rejects(nuevo.ejecutar(pedido([{ ...menu, PedidoMenu: [] }])), /cantidades/);
  await assert.rejects(nuevo.ejecutar(pedido([{ ...menu, PedidoMenu: [{ ...menu.PedidoMenu[0], IdProductoSeccionMenu: 9 }] }])), /selección/);
  await assert.rejects(nuevo.ejecutar(pedido([{ ...combo, PedidoComplemento: [{ ...extra, Cantidad: 2 }] }])), /límite/);
  const { plan } = await nuevo.ejecutar(pedido([menu, combo]));
  assert.deepEqual(plan.trabajos.map(t => [t.datos.area, t.datos.lineas.map(l => [l.descripcion, l.observacion])]), [
    ['Cocina', [['Sopa (Menú del día)', 'Sin sal'], ['Hamburguesa', '']]], ['Bar', [['Bebida', 'Complemento']]],
  ]);
});

async function prepararDesayuno(maestros, areasBebida = []) {
  const copia = await maestros.obtener();
  copia.maestros.productos.push(
    { IdProducto: 1, Tipo: 1, IdSeccionMenu: 0, Activo: true, NombreCorto: 'Desayuno', Precio: 15, AreasImpresion: [],
      SeccionesMenu: [{ IdSeccionMenu: 7, Opciones: [4, 5], Cantidad: 1 }, { IdSeccionMenu: 6, Opciones: [2], Cantidad: 1 }] },
    { IdProducto: 4, Tipo: 1, IdSeccionMenu: 7, Activo: true, NombreCorto: 'Sándwich de pollo', AreasImpresion: [] },
    { IdProducto: 5, Tipo: 1, IdSeccionMenu: 7, Activo: true, NombreCorto: 'Queque de vainilla', AreasImpresion: [] },
    { IdProducto: 2, Tipo: 1, IdSeccionMenu: 6, Activo: true, NombreCorto: 'Café con leche', AreasImpresion: areasBebida },
  );
  await maestros.guardar(2, copia.maestros);
  return { ...detalle, Producto: { IdProducto: 1 }, Precio: 15, Subtotal: 15, PedidoMenu: [
    { IdSeccionMenu: 7, IdProductoSeccionMenu: 4, Cantidad: 1 }, { IdSeccionMenu: 6, IdProductoSeccionMenu: 2, Cantidad: 1 },
  ] };
}

test('guarda, amplía, anula y regulariza menús sin destino de impresión sin generar acuses', async t => {
  const { maestros, diario, progreso, modificar, ruta } = await conCaja(t);
  const menu = await prepararDesayuno(maestros);
  const abrir = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  const solicitud = { ...actor, idOperacion: randomUUID(), pedido: { ...cabecera, IdPedido: 0, ListaPedidoDet: [menu] } };
  const { numeroOffline, plan } = await abrir.ejecutar(solicitud);
  assert.equal(plan, undefined);
  assert.equal((await abrir.ejecutar(solicitud)).resultado, 'existente');
  const agregado = peticion('agregar-productos', 1, { referenciaPedido: numeroOffline, detalles: [menu] });
  assert.equal((await modificar.ejecutar(agregado)).plan, undefined);
  assert.equal((await modificar.ejecutar(agregado)).resultado, 'existente');
  const pedido = await diario.obtener('pedidos', numeroOffline);
  assert.equal(pedido.Total, 30);
  assert.deepEqual(pedido.ListaPedidoDet.map(linea => linea.PedidoMenu), [menu.PedidoMenu, menu.PedidoMenu]);
  await modificar.ejecutar(peticion('anular-producto', 2, { referenciaPedido: numeroOffline, item: 1, motivo: 'Cambio' }));
  await modificar.ejecutar(peticion('anular-pedido', 3, { referenciaPedido: numeroOffline, motivo: 'Cancelación' }));
  assert.deepEqual(await new ListarImpresionesPendientesOffline(maestros, diario, progreso).ejecutar(actor), []);
  const lote = new RegularizarLoteLocal(diario, new RepositorioLotesLocales(ruta), {
    regularizar: async ({ id, operaciones }) => {
      assert.deepEqual(operaciones.map(item => item.operacion.datos.impresionNoRequerida), [true, true, true, true]);
      assert.ok(operaciones.every(item => item.cambios.every(cambio => !cambio.identificador.startsWith('plan-'))));
      return { id, confirmado: true, resultados: operaciones.map(item => item.id === solicitud.idOperacion
        ? { idOperacion: item.id, numeroOffline, idPedido: 1, nroCuenta: 1, nroPedido: 10 } : { idOperacion: item.id }) };
    },
  }, { tenantId: 'restaurante', identificadorEstacion: 'caja' });
  const confirmar = new ConfirmarImpresionPedidoOffline(maestros, diario, progreso);
  await assert.rejects(confirmar.ejecutar({ ...actor, idOperacion: randomUUID(), idOperacionPedido: solicitud.idOperacion,
    numeroOffline, impresoras: ['Principal'] }), /no requiere impresión/);
  assert.equal((await lote.ejecutar()).operaciones, 4);
  assert.deepEqual(await lote.ejecutar(), { enviado: false });
});

test('en un pedido mixto solo imprime las líneas y opciones con área y exige su confirmación', async t => {
  const { maestros, diario, progreso } = await conCaja(t);
  const menu = await prepararDesayuno(maestros, [2]);
  const abrir = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  const { plan } = await abrir.ejecutar({ ...actor, idOperacion: randomUUID(),
    pedido: { ...cabecera, IdPedido: 0, ListaPedidoDet: [menu, detalle] } });
  assert.deepEqual(plan.trabajos.map(trabajo => [trabajo.datos.area, trabajo.datos.lineas.map(linea => linea.descripcion)]),
    [['Bar', ['Café con leche (Desayuno)', 'Café']], ['Cocina', ['Café']]]);
  const operaciones = await diario.listarDesde(0, { soloReferencias: true });
  assert.equal(operaciones[0].operacion.datos.impresionNoRequerida, undefined);
  assert.throws(() => validarOperacionesRegularizables(operaciones), /sin confirmación de impresión/);
  operaciones[0].operacion.datos.impresionNoRequerida = true;
  assert.throws(() => validarOperacionesRegularizables(operaciones), /requiere confirmación/);
});

test('el menú de secciones opcionales se puede dejar para después solo o junto a un menú ya configurado', async t => {
  const { maestros, diario, progreso, modificar } = await conCaja(t);
  const desayuno = await prepararDesayuno(maestros);
  const copia = await maestros.obtener();
  copia.maestros.productos.push({ IdProducto: 30, Tipo: 1, IdSeccionMenu: 0, Activo: true, Precio: 10,
    NombreCorto: 'Postre a elegir', AreasImpresion: [],
    SeccionesMenu: [{ IdSeccionMenu: 7, Cantidad: 1, EsOpcional: true, Opciones: [4] }] });
  await maestros.guardar(3, copia.maestros);
  const opcional = { ...detalle, Producto: { IdProducto: 30 }, PedidoMenu: [] };
  const abrir = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  const solicitud = { ...actor, idOperacion: randomUUID(), pedido: { ...cabecera, IdPedido: 0, ListaPedidoDet: [opcional] } };
  const { numeroOffline, plan } = await abrir.ejecutar(solicitud);
  assert.equal(plan, undefined);
  assert.equal((await modificar.ejecutar(peticion('agregar-productos', 1, { referenciaPedido: numeroOffline,
    detalles: [opcional, desayuno] }))).plan, undefined);
  assert.equal((await modificar.ejecutar(peticion('anular-producto', 2, { referenciaPedido: numeroOffline,
    item: 1, motivo: 'Cancelación' }))).plan, undefined);
  const operaciones = await diario.listarDesde(0, { soloReferencias: true });
  assert.deepEqual(operaciones.map(item => item.operacion.datos.impresionNoRequerida), [true, true, true]);
  validarOperacionesRegularizables(operaciones);
  const sinSeleccionActiva = { ...desayuno, PedidoMenu: desayuno.PedidoMenu.map(m => ({ ...m, Estado: 0 })) };
  await assert.rejects(modificar.ejecutar(peticion('agregar-productos', 3, { referenciaPedido: numeroOffline,
    detalles: [sinSeleccionActiva] })), /selección/);
});

test('rechaza un menú cuya opción tiene un área asignada que falta en la caja', async t => {
  const { maestros, diario, progreso } = await conCaja(t);
  const menu = await prepararDesayuno(maestros, [77]);
  const abrir = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  await assert.rejects(abrir.ejecutar({ ...actor, idOperacion: randomUUID(),
    pedido: { ...cabecera, IdPedido: 0, ListaPedidoDet: [menu] } }), /impresora/);
  assert.deepEqual(await diario.listarDesde(0), []);
});

test('recupera dos comandas del mismo pedido tras un cierre y permite imprimirlas una sola vez', async t => {
  const { maestros, diario, progreso } = await conCaja(t);
  const copia = await maestros.obtener();
  const solicitud = { ...actor, idOperacion: randomUUID(), pedido: { ...cabecera, IdPedido: 0, ListaPedidoDet: [detalle] } };
  const caso = new RegistrarNuevoPedidoOffline(maestros, diario, { ejecutarExclusivo: async () => { throw new Error('Fallo de disco'); } });
  await assert.rejects(caso.ejecutar(solicitud), /Fallo de disco/);
  const pendientes = new ListarImpresionesPendientesOffline(maestros, diario, progreso);
  assert.deepEqual(await pendientes.ejecutar({ ...actor, idUsuario: 2 }), []);
  const [pendiente] = await pendientes.ejecutar({ ...actor, idUsuario: 2, todaLaEstacion: true });
  const plan = pendiente.plan;
  const casoRecuperado = new RegistrarNuevoPedidoOffline(maestros, diario, progreso);
  const respuesta = await casoRecuperado.ejecutar(solicitud);
  assert.deepEqual(respuesta.plan, plan);
  assert.equal(respuesta.resultado, 'existente');
  const gestor = new GestionarProgresoImpresionOffline(maestros, diario, progreso);
  const identidad = { ...actor, idOperacion: plan.idOperacion, idOperacionPedido: solicitud.idOperacion, numeroOffline: plan.numeroOffline };
  await gestor.ejecutar({ accion: 'crear', ...identidad, trabajos: plan.trabajos });
  for (const indice of [0, 1]) {
    const idIntento = randomUUID();
    await gestor.ejecutar({ ...identidad, accion: 'iniciar', indice, idIntento });
    await gestor.ejecutar({ ...identidad, accion: 'aceptar', indice, idIntento });
  }
  const confirmar = new ConfirmarImpresionPedidoOffline(maestros, diario, progreso);
  await confirmar.ejecutar({ ...identidad, impresoras: ['Principal'] });
  assert.deepEqual(await pendientes.ejecutar(actor), []);
  validarOperacionesRegularizables(await diario.listarDesde(0));
  copia.maestros.areas[1].NombreImpresora = '';
  // El fallo de configuración debe detectarse antes de guardar el pedido.
  await maestros.guardar(2, copia.maestros);
  await assert.rejects(casoRecuperado.ejecutar({ ...solicitud, idOperacion: randomUUID(),
    pedido: { ...solicitud.pedido, IdCanalVenta: 3 } }), /impresora/);
  assert.equal((await diario.listarDesde(0)).length, 2);
});

test('publica una nueva copia tras el acuse y retira las proyecciones viejas incluso después de reiniciar', async t => {
  const { maestros, diario, modificar, ruta } = await conCaja(t, [existente()]);
  await modificar.ejecutar(peticion('descuento', 0, { idDescuento: 6 }));
  const lotes = new RepositorioLotesLocales(ruta);
  const nube = { regularizar: async lote => ({ id: lote.id, confirmado: true, resultados: lote.operaciones.map(item => ({ idOperacion: item.id })) }) };
  const nueva = (await maestros.obtener()).maestros;
  nueva.pedidos[0].ListaPedidoDet[0].Precio = 20;
  nueva.pedidos[0].ListaPedidoDet[0].Subtotal = 20;
  const sincronizar = new SincronizarMaestrosLocales({ obtenerInstantanea: async () => ({ version: 2, maestros: nueva }) }, maestros, diario, lotes);
  await assert.rejects(sincronizar.ejecutar(), /sin confirmar/);
  await new RegularizarLoteLocal(diario, lotes, nube, { tenantId: 'restaurante', identificadorEstacion: 'caja' }).ejecutar();
  await sincronizar.ejecutar();
  assert.equal((await maestros.obtener()).hastaSecuencia, 1);
  const reiniciado = new DiarioTransaccionalLocal(ruta);
  assert.equal((await new ObtenerPedidoLocal(maestros, reiniciado).ejecutar('ONLINE-18-1')).contenido.ListaPedidoDet[0].Subtotal, 20);
  const [cuenta] = await new ListarPedidosLocales(maestros, reiniciado).ejecutar();
  assert.equal(cuenta.version, 0);
  assert.equal((await new ObtenerMaestroLocal(maestros, reiniciado).ejecutar('mesas')).datos[0].Ocupado, 1);
  const segunda = new ModificarPedidoOffline(maestros, reiniciado, null);
  await assert.rejects(segunda.ejecutar(peticion('descuento', 0, { idDescuento: 6, versionMaestros: 1 })), /copia de caja/);
  await segunda.ejecutar(peticion('descuento', 0, { idDescuento: 6 }));
  assert.equal((await reiniciado.obtener('pedidos', 'ONLINE-18-1')).Total, 25.5);
});
