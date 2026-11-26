import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { leerConfiguracionCaja } from '../src/application/validators/validar-configuracion-caja.mjs';
import { prepararCajaLocal } from '../src/preparar-caja-local.mjs';
import { ObtenerEstadoCaja } from '../src/application/use-cases/obtener-estado-caja.mjs';
import { crearServidorLocal } from '../src/interfaces/http/crear-servidor-local.mjs';
import { clienteHttpDePrueba } from '../test-support/http-en-memoria.mjs';

const origen = 'https://restaurante.example';
const base = 'http://127.0.0.1:17861/api/';
const opciones = (datos, token) => ({ method: 'POST', body: JSON.stringify(datos),
  headers: { Origin: origen, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
const contexto = { tenantId: 'sucursal-a', identificadorEstacion: 'CAJA 1', idCaja: 1, idEstacion: 5 };
const maestros = { contexto, productos: [{ IdProducto: 4, NombreCorto: 'Café', Activo: true, AreasImpresion: [2] }], mesas: [],
  areas: [{ IdAreaImpresion: 2, NombreImpresora: 'Cocina', Descripcion: 'Barra' }], pedidos: [], cajas: [{ IdCaja: 1, CanalesVenta: [2, 3] }],
  turnos: [{ IdTurno: 3, IdCaja: 1, Estado: 1 }], usuarios: [{ IdUsuario: 3, IdEmpleado: 3, IdNivel: 2, NombreUsuario: 'Ana', Activo: true }] };
const entorno = { LACOMANDA_OFFLINE_DATA_DIR: tmpdir(), LACOMANDA_OFFLINE_API_URL: 'https://api.example/api',
  LACOMANDA_OFFLINE_ORIGINS: origen, LACOMANDA_OFFLINE_TENANT: 'sucursal-a', LACOMANDA_OFFLINE_ESTACION: 'CAJA 1',
  LACOMANDA_OFFLINE_ENABLED: 'true' };

test('una carta de menús acepta opciones sin destino y exige que las áreas asignadas estén disponibles', async () => {
  const principal = { IdProducto: 1, NombreCorto: 'Menú', Activo: true, Tipo: 1, IdSeccionMenu: 0,
    SeccionesMenu: [{ IdSeccionMenu: 3, Cantidad: 1, Opciones: [2] }] };
  const opcion = { IdProducto: 2, NombreCorto: 'Arroz', Activo: true, Tipo: 1, IdSeccionMenu: 3,
    VentaIndividual: false, AreasImpresion: [2] };
  const productos = [principal, opcion];
  const carta = { ...maestros, productos };
  const caso = new ObtenerEstadoCaja({ obtener: async () => ({ version: 1, maestros: carta }) },
    true, contexto, { obtenerUltimaSecuencia: async () => 0 }, { obtenerCursor: async () => ({ hastaSecuencia: 0 }) });
  assert.equal((await caso.ejecutar()).capacidades.pedidos, true);
  opcion.AreasImpresion = [];
  carta.areas = [];
  const sinImpresora = await caso.ejecutar();
  assert.equal(sinImpresora.versionProtocolo, 2);
  assert.equal(sinImpresora.capacidades.impresion, false);
  assert.equal(sinImpresora.capacidades.pedidos, true);
  carta.areas = maestros.areas;
  opcion.AreasImpresion = [99];
  assert.equal((await caso.ejecutar()).capacidades.pedidos, false);
  principal.SeccionesMenu[0].EsOpcional = true;
  assert.equal((await caso.ejecutar()).capacidades.pedidos, true);
  principal.SeccionesMenu[0].EsOpcional = false;
  productos.push({ ...opcion, IdProducto: 3, Tipo: 2, AreasImpresion: [2], NombreCorto: 'Combo' });
  assert.equal((await caso.ejecutar()).capacidades.pedidos, true);
});

test('exige identidad, URL HTTPS, orígenes exactos y configuración TLS para la LAN', () => {
  const config = leerConfiguracionCaja(entorno);
  assert.equal(config.urlInstantanea, 'https://api.example/api/offline/instantanea/CAJA%201');
  assert.equal(config.urlLotes, 'https://api.example/api/offline/lotes');
  assert.equal(config.lan, null);
  assert.equal(leerConfiguracionCaja({ ...entorno, LACOMANDA_OFFLINE_ENABLED: undefined }).habilitado, false);
  for (const cambio of [{ LACOMANDA_OFFLINE_ESTACION: '' }, { LACOMANDA_OFFLINE_API_URL: 'http://api.example' },
    { LACOMANDA_OFFLINE_ORIGINS: 'https://*.example' }, { LACOMANDA_OFFLINE_ORIGINS: 'http://app.example' },
    { LACOMANDA_OFFLINE_ENABLED: '1' }, { LACOMANDA_OFFLINE_PORT: '0' }, { LACOMANDA_OFFLINE_HOST: '0.0.0.0' }]) {
    assert.throws(() => leerConfiguracionCaja({ ...entorno, ...cambio }));
  }
});

test('el runtime sincroniza con sesión de caja, mantiene la copia al reiniciar y rechaza cruces de sucursal', async t => {
  const directorio = await mkdtemp(join(tmpdir(), 'lacomanda-runtime-'));
  t.after(() => rm(directorio, { recursive: true, force: true }));
  const config = leerConfiguracionCaja({ ...entorno, LACOMANDA_OFFLINE_DATA_DIR: directorio });
  const llamadas = [];
  let copia = { version: 1, maestros };
  const nube = async (url, init) => {
    llamadas.push({ url, token: init.headers.Authorization });
    return init.headers.Authorization === 'Bearer caducado'
      ? new Response('', { status: 401 }) : Response.json(copia);
  };
  const dependencias = await prepararCajaLocal(config, nube);
  const servidor = crearServidorLocal(dependencias);
  const caja = clienteHttpDePrueba(servidor);
  const movil = clienteHttpDePrueba(servidor, '192.168.1.2');
  const estado = async () => (await caja(base + 'estado')).json();
  const inicial = await estado();
  assert.equal(inicial.disponible, false);
  assert.equal(inicial.contexto, null);
  assert.deepEqual(inicial.identidad, { tenantId: 'sucursal-a', identificadorEstacion: 'CAJA 1' });
  assert.equal((await caja(base + 'pedidos', opciones({}))).status, 503);
  assert.equal((await caja(base + 'sincronizar', opciones({}))).status, 401);
  assert.equal((await movil(base + 'sincronizar', opciones({}, 'sesion'))).status, 403);
  assert.equal((await caja('http://otro.example/api/sincronizar', opciones({}, 'sesion'))).status, 403);
  assert.equal((await movil(base + 'impresiones/pendientes', opciones({ todaLaEstacion: true }))).status, 403);
  assert.equal(llamadas.length, 0);
  assert.equal((await caja(base + 'sincronizar', opciones({}, 'caducado'))).status, 401);
  assert.equal((await caja(base + 'sincronizar', opciones({}, 'sesion'))).status, 200);
  assert.deepEqual(llamadas.at(-1), { url: config.urlInstantanea, token: 'Bearer sesion' });
  assert.deepEqual((await estado()).capacidades, { pedidos: true, impresion: true, cobros: false });
  assert.equal((await caja(base + 'pedidos', opciones({ idEstacion: 99 }))).status, 403);
  assert.equal((await caja(base + 'cobros', opciones({}))).status, 503);
  assert.equal((await movil(base + 'pedidos/modificar', opciones({ accion: 'descuento' }))).status, 403);
  assert.equal((await caja(base + 'pedidos/modificar', opciones({ accion: 'anular-pedido', idUsuario: 3, idAutorizador: 5 }))).status, 403);
  assert.deepEqual(await (await caja(base + 'regularizar', opciones({}, 'sesion'))).json(), { enviado: false });
  copia = { version: 2, maestros: { ...maestros, contexto: { ...contexto, tenantId: 'sucursal-b' } } };
  assert.equal((await caja(base + 'sincronizar', opciones({}, 'otra-sesion'))).status, 409);
  assert.equal((await estado()).version, 1);
  const reinicio = await prepararCajaLocal(config, nube);
  assert.equal((await reinicio.obtenerEstado.ejecutar()).disponible, true);
  await assert.rejects(prepararCajaLocal({ ...config, contexto: { ...contexto, identificadorEstacion: 'Otra' } }, nube), /sucursal/);
});

test('un pedido del móvil se imprime en caja, se cobra y se regulariza una sola vez tras perder la respuesta', async t => {
  const directorio = await mkdtemp(join(tmpdir(), 'lacomanda-circuito-'));
  t.after(() => rm(directorio, { recursive: true, force: true }));
  const config = leerConfiguracionCaja({ ...entorno, LACOMANDA_OFFLINE_DATA_DIR: directorio });
  const copia = { ...maestros, mesas: [{ IdEspacio: 7, Descripcion: 'Mesa 7', Activo: true, Ocupado: 0 }],
    documentos: [{ IdTipoDocumento: 2 }], monedas: [{ IdMoneda: 'PEN', EsOficial: true }], tipospago: [{ IdTipoPago: 1 }] };
  const envios = [];
  let acuse;
  const nube = async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer sesion');
    if (init.method === 'GET') return Response.json({ version: acuse ? 2 : 1, maestros: copia });
    assert.equal(url, config.urlLotes);
    const lote = JSON.parse(init.body);
    envios.push(lote);
    if (!acuse) {
      acuse = { confirmado: true, id: lote.id, resultados: lote.operaciones.map(op => {
        const resultado = { idOperacion: op.id };
        if (op.operacion.tipo === 'registrar-pedido') Object.assign(resultado,
          { numeroOffline: op.operacion.datos.numeroOffline, idPedido: 41, nroPedido: 73, nroCuenta: 1 });
        if (op.operacion.tipo === 'registrar-cobro') Object.assign(resultado, { idVenta: 31, serie: 'B001', numeroDocumento: 42 });
        return resultado;
      }) };
      throw new Error('Respuesta perdida después de confirmar la transacción.');
    }
    assert.deepEqual(envios[0], lote);
    return Response.json(acuse);
  };
  let servidor = crearServidorLocal(await prepararCajaLocal(config, nube));
  let caja = clienteHttpDePrueba(servidor);
  let movil = clienteHttpDePrueba(servidor, '192.168.1.4');
  async function operar(cliente, ruta, datos, token) {
    const respuesta = await cliente(base + ruta, opciones(datos, token));
    const contenido = await respuesta.json();
    assert.equal(respuesta.status, 200, JSON.stringify(contenido));
    return contenido;
  }
  const leer = async (cliente, ruta) => (await cliente(base + ruta, { headers: { Origin: origen } })).json();
  await operar(caja, 'sincronizar', {}, 'sesion');
  assert.equal((await leer(movil, 'estado')).regularizacionPendiente, false);
  const idUsuario = (await leer(movil, 'usuarios'))[0].IdUsuario;
  const info = { idEstacion: contexto.idEstacion, idUsuario };
  const pedido = { IdPedido: 0, NroCuenta: 1, IdCaja: 1, IdTurno: 3, IdEmpleado: 3, IdCanalVenta: 2,
    IdEspacio: 7, Importe: 20, Total: 20, Dscto: 0, Moneda: 'PEN',
    ListaPedidoDet: [{ IdPedido: 0, IdEstacion: contexto.idEstacion, Ip: contexto.identificadorEstacion,
      Producto: { IdProducto: 4 }, Cantidad: 2, Precio: 10, Subtotal: 20 }] };
  const solicitud = { ...info, idOperacion: randomUUID(), pedido };
  const consulta = 'operaciones/' + solicitud.idOperacion + '?idUsuario=' + idUsuario;
  assert.equal((await movil(base + consulta, { headers: { Origin: origen } })).status, 404);
  const { numeroOffline, plan } = await operar(movil, 'pedidos', solicitud);
  assert.equal((await leer(movil, 'estado')).regularizacionPendiente, true);
  assert.deepEqual(await leer(movil, consulta), { registrada: true, idOperacion: solicitud.idOperacion, tipo: 'registrar-pedido', referencia: numeroOffline });
  assert.equal((await movil(base + 'operaciones/' + solicitud.idOperacion + '?idUsuario=99', { headers: { Origin: origen } })).status, 404);
  assert.equal((await movil(base + 'operaciones/incorrecto?idUsuario=1', { headers: { Origin: origen } })).status, 400);
  assert.equal((await movil(base + 'operaciones/' + solicitud.idOperacion, { headers: { Origin: origen } })).status, 400);
  assert.deepEqual((await operar(movil, 'pedidos', solicitud)).plan, plan);
  const [pendiente] = await operar(caja, 'impresiones/pendientes', { ...info, todaLaEstacion: true });
  assert.deepEqual(pendiente.plan, plan);
  const { trabajos, ...identidad } = plan;
  const intento = { ...identidad, indice: 0, idIntento: randomUUID() };
  await operar(caja, 'impresiones/progreso', { ...intento, accion: 'iniciar' });
  const html = await operar(caja, 'impresiones/preparar', { ...trabajos[0].datos, fechaLocal: '24/11/2026 12:00' });
  assert.match(html, /Café/);
  // Simula la aceptación del único trabajo por QZ Tray antes de confirmar el pedido.
  await operar(caja, 'impresiones/progreso', { ...intento, accion: 'aceptar' });
  await operar(caja, 'impresiones/confirmar', { ...identidad, impresoras: [trabajos[0].impresora] });
  assert.deepEqual(await operar(caja, 'impresiones/pendientes', { ...info, todaLaEstacion: true }), []);
  const { version } = await leer(movil, 'pedidos/' + numeroOffline);
  const cobro = { ...info, idOperacion: randomUUID(), referenciaPedido: numeroOffline, versionPedido: version,
    correoComprobante: 'cliente@example.org', documento: { usarClienteGenerico: true, cliente: null,
      venta: { IdTipoDocumento: 2, IdCaja: 1, IdTurno: 3, IdPedido: 0, NroCuenta: 1, Importe: 20, Total: 20,
        Dscto: 0, Propina: 0, Impuesto1: 0, NumDocumento: 0, Serie: '', VentaAlCredito: false, UsuRegistra: idUsuario, Estado: 1 },
      listaPago: [{ IdTipoPago: 1, IdMoneda: 'PEN', MontoPagado: 20, MontoRecibido: 20, MontoVenta: 20,
        Vuelto: 0, Propina: 0, TipoCambio: 1, IdTurno: 3, UsuReg: idUsuario, Estado: 1 }] } };
  assert.equal((await operar(caja, 'cobros', cobro)).resultado, 'registrada');
  assert.equal((await leer(caja, 'pedidos/' + numeroOffline)).contenido.Estado, 2);
  assert.equal((await caja(base + 'regularizar', opciones({}, 'sesion'))).status, 502);
  servidor = crearServidorLocal(await prepararCajaLocal(config, nube));
  caja = clienteHttpDePrueba(servidor);
  movil = clienteHttpDePrueba(servidor, '192.168.1.4');
  assert.equal((await leer(movil, 'estado')).regularizacionPendiente, true);
  assert.equal((await caja(base + 'sincronizar', opciones({}, 'sesion'))).status, 409);
  assert.equal((await operar(caja, 'regularizar', {}, 'sesion')).operaciones, 3);
  assert.equal((await leer(movil, 'estado')).regularizacionPendiente, false);
  assert.deepEqual(envios[0].operaciones.map(op => op.operacion.tipo), ['registrar-pedido', 'confirmar-impresion', 'registrar-cobro']);
  assert.deepEqual(await operar(caja, 'regularizar', {}, 'sesion'), { enviado: false });
  assert.deepEqual(await operar(caja, 'sincronizar', {}, 'sesion'), { actualizada: true, version: 2 });
  assert.deepEqual(await leer(caja, 'pedidos'), []);
  assert.deepEqual(await leer(caja, 'operaciones/' + cobro.idOperacion + '?idUsuario=' + idUsuario),
    { registrada: true, idOperacion: cobro.idOperacion, tipo: 'registrar-cobro', referencia: numeroOffline });
  assert.equal(envios.length, 2);
});
