import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { esHostDeCaja } from '../../application/validators/validar-configuracion-caja.mjs';
import { esMaestroConsultable } from '../../application/use-cases/obtener-maestro-local.mjs';

export function crearServidorLocal({ obtenerMaestroLocal, obtenerPedidoLocal, listarPedidosLocales, listarUsuariosOffline, diario,
  registrarPedido, modificarPedido, registrarCobro, confirmarImpresion, prepararComanda, progresoImpresion, listarImpresionesPendientes,
  obtenerEstado, consultarOperacion, sincronizar, regularizar, habilitarOperaciones = false, origenesPermitidos = [], tls = null }) {
  const origenes = new Set(origenesPermitidos);
  const escrituras = new Map([
    ['/api/pedidos', [registrarPedido, 'pedidos']],
    ['/api/pedidos/modificar', [modificarPedido, 'pedidos']],
    ['/api/cobros', [registrarCobro, 'cobros']],
    ['/api/impresiones/preparar', [prepararComanda, 'impresion']],
    ['/api/impresiones/progreso', [progresoImpresion, 'impresion']],
    ['/api/impresiones/pendientes', [listarImpresionesPendientes, 'impresion']],
    ['/api/impresiones/confirmar', [confirmarImpresion, 'impresion']],
  ]);
  const gestion = new Map([['/api/sincronizar', sincronizar], ['/api/regularizar', regularizar]]);
  const atender = async (solicitud, respuesta) => {
    const origen = solicitud.headers.origin;
    if (origen && !origenes.has(origen)) {
      return responder(respuesta, 403, { mensaje: 'Origen no autorizado.' });
    }
    let ruta, parametros, local;
    try {
      const url = new URL(solicitud.url, 'http://localhost');
      ruta = url.pathname;
      parametros = url.searchParams;
      local = !tls && esHostDeCaja(solicitud.socket.remoteAddress)
        && esHostDeCaja(new URL('http://' + solicitud.headers.host).hostname);
    } catch {
      return responder(respuesta, 400, { mensaje: 'Dirección no válida.' });
    }
    if (!origen && !(local && ruta === '/api/estado' && solicitud.method === 'GET')) {
      return responder(respuesta, 403, { mensaje: 'Origen no autorizado.' });
    }
    if (origen) {
      respuesta.setHeader('Access-Control-Allow-Origin', origen);
      respuesta.setHeader('Vary', 'Origin');
    }
    if (solicitud.method === 'OPTIONS') {
      if (!origen) return responder(respuesta, 403, { mensaje: 'Origen no autorizado.' });
      respuesta.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      respuesta.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (solicitud.headers['access-control-request-private-network'] === 'true') {
        respuesta.setHeader('Access-Control-Allow-Private-Network', 'true');
      }
      respuesta.writeHead(204);
      return respuesta.end();
    }
    if (solicitud.method === 'POST' && (escrituras.has(ruta) || gestion.has(ruta))) {
      if (gestion.has(ruta) && !local) return responder(respuesta, 403, { mensaje: 'Esta acción se realiza en la computadora de caja.' });
      if (!/^application\/json(?:\s*;|$)/i.test(solicitud.headers['content-type'] ?? '')) {
        return responder(respuesta, 415, { mensaje: 'Se requiere contenido JSON.' });
      }
      try {
        const datos = await leerJson(solicitud);
        if (gestion.has(ruta)) {
          const token = /^Bearer ([A-Za-z0-9+./_~=-]+)$/i.exec(solicitud.headers.authorization ?? '')?.[1];
          if (!token) return responder(respuesta, 401, { mensaje: 'Se necesita una sesión de caja en la nube.' });
          if (!gestion.get(ruta)) return responder(respuesta, 503, { mensaje: 'La gestión de nube no está configurada.' });
          return responder(respuesta, 200, await gestion.get(ruta)(token));
        }
        if (datos?.todaLaEstacion === true && !local) {
          return responder(respuesta, 403, { mensaje: 'La cola de toda la estación se consulta en caja.' });
        }
        if (ruta === '/api/pedidos/modificar' && ['descuento', 'anular-pedido', 'anular-producto'].includes(datos?.accion)
            && (!local || (datos.idAutorizador != null && datos.idAutorizador !== datos.idUsuario))) {
          return responder(respuesta, 403, { mensaje: 'La persona autorizada debe confirmar la operación en caja.' });
        }
        if (ruta.startsWith('/api/impresiones/') && ruta !== '/api/impresiones/pendientes' && !local) {
          return responder(respuesta, 403, { mensaje: 'La impresión física se gestiona en caja.' });
        }
        const [caso, capacidad] = escrituras.get(ruta);
        const estado = obtenerEstado ? await obtenerEstado.ejecutar() : null;
        if (!(estado ? estado.capacidades[capacidad] : habilitarOperaciones) || !caso) {
          return responder(respuesta, 503, { mensaje: estado?.mensaje ?? 'La operación no está disponible en caja.' });
        }
        if (estado && datos?.idEstacion !== undefined && datos.idEstacion !== estado.contexto?.idEstacion) {
          return responder(respuesta, 403, { mensaje: 'La operación corresponde a otra estación.' });
        }
        return responder(respuesta, 200, await caso.ejecutar(datos));
      } catch (error) {
        if (error?.codigoHttp) return responder(respuesta, error.codigoHttp, { mensaje: error.message });
        if (error instanceof TypeError || error instanceof SyntaxError) {
          return responder(respuesta, 400, { mensaje: 'Los datos enviados no son válidos.' });
        }
        if (typeof error?.code === 'string' && /^E[A-Z0-9]+$/.test(error.code)) {
          return responder(respuesta, 500, { mensaje: 'No se pudo guardar la operación en caja.' });
        }
        return responder(respuesta, 409, { mensaje: error?.message ?? 'No se pudo completar la operación.' });
      }
    }
    if (solicitud.method !== 'GET') {
      return responder(respuesta, 405, { mensaje: 'Método no permitido.' });
    }
    try {
      if (ruta === '/api/estado') {
        return responder(respuesta, 200, obtenerEstado ? await obtenerEstado.ejecutar() : {
          disponible: false, regularizacionPendiente: true, mensaje: 'La caja no está configurada.',
        });
      }
      const operacion = /^\/api\/operaciones\/([^/]+)$/.exec(ruta);
      if (operacion && consultarOperacion) {
        const resultado = await consultarOperacion.ejecutar(operacion[1], Number(parametros.get('idUsuario')));
        return resultado ? responder(respuesta, 200, resultado) : responder(respuesta, 404, { mensaje: 'Operación no encontrada.' });
      }
      const maestro = /^\/api\/maestros\/([a-z-]+)$/.exec(ruta);
      if (maestro && esMaestroConsultable(maestro[1])) {
        const resultado = await obtenerMaestroLocal.ejecutar(maestro[1]);
        if (!resultado) return responder(respuesta, 503, { mensaje: 'Los maestros locales no están preparados.' });
        return responder(respuesta, 200, resultado);
      }
      if (ruta === '/api/usuarios' && listarUsuariosOffline) {
        return responder(respuesta, 200, await listarUsuariosOffline.ejecutar());
      }
      const usuario = /^\/api\/usuarios\/([1-9][0-9]*)$/.exec(ruta);
      if (usuario && listarUsuariosOffline) {
        const id = Number(usuario[1]);
        if (!Number.isSafeInteger(id)) return responder(respuesta, 400, { mensaje: 'Usuario no válido.' });
        const usuarios = await listarUsuariosOffline.ejecutar();
        const seleccionado = usuarios.find(item => item.IdUsuario === id);
        if (!seleccionado) return responder(respuesta, 404, { mensaje: 'Usuario no disponible.' });
        return responder(respuesta, 200, seleccionado);
      }
      if (ruta === '/api/pedidos' && diario) {
        return responder(respuesta, 200, listarPedidosLocales
          ? await listarPedidosLocales.ejecutar()
          : await diario.listar('pedidos'));
      }
      const pedido = /^\/api\/pedidos\/([A-Za-z0-9][A-Za-z0-9_-]{0,99})$/.exec(ruta);
      if (pedido && diario) {
        const resultado = obtenerPedidoLocal
          ? await obtenerPedidoLocal.ejecutar(pedido[1])
          : await diario.obtenerConVersion('pedidos', pedido[1]);
        if (!resultado.contenido) return responder(respuesta, 404, { mensaje: 'Pedido no encontrado.' });
        return responder(respuesta, 200, resultado);
      }
      return responder(respuesta, 404, { mensaje: 'Ruta no encontrada.' });
    } catch (error) {
      if (error instanceof TypeError) return responder(respuesta, 400, { mensaje: 'La consulta no es válida.' });
      return responder(respuesta, 500, { mensaje: 'No se pudo leer la información local.' });
    }
  };
  return tls ? createSecureServer(tls, atender) : createServer(atender);
}

async function leerJson(solicitud) {
  const limite = 1024 * 1024;
  const partes = [];
  let longitud = 0;
  for await (const parte of solicitud) {
    longitud += parte.length;
    if (longitud <= limite) partes.push(parte);
  }
  if (longitud > limite) {
    const error = new Error('La solicitud supera el tamaño permitido.');
    error.codigoHttp = 413;
    throw error;
  }
  return JSON.parse(Buffer.concat(partes).toString('utf8'));
}

function responder(respuesta, estado, datos) {
  respuesta.writeHead(estado, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  respuesta.end(JSON.stringify(datos));
}
