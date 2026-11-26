import { serializarJsonLocal } from '../validators/serializar-json-local.mjs';
import { validarDetallesNuevos } from '../validators/validar-nuevo-pedido-offline.mjs';
import { validarVersionMaestros } from '../validators/validar-version-maestros.mjs';
import { obtenerEstadoPrevio, validarDescuento, validarModificacionPedido } from '../validators/validar-modificacion-pedido-offline.mjs';
import { ListarPedidosLocales } from './listar-pedidos-locales.mjs';
import { planificarImpresion, recuperarProgreso } from './planificar-impresion-pedido-offline.mjs';

export class ModificarPedidoOffline {
  constructor(maestros, diario, progreso) {
    this.maestros = maestros;
    this.diario = diario;
    this.progreso = progreso;
    this.listarPedidos = new ListarPedidosLocales(maestros, diario);
  }

  async ejecutar(datos) {
    const solicitud = JSON.parse(serializarJsonLocal(datos));
    const { idOperacion, referenciaPedido, accion } = solicitud;
    const anterior = await this.diario.obtenerTransaccion(idOperacion);
    if (anterior) {
      if (anterior.operacion?.tipo !== 'modificar-pedido' || JSON.stringify(anterior.operacion.datos.solicitud) !== JSON.stringify(solicitud)) {
        throw new Error('El identificador de operación ya contiene otros datos.');
      }
      await this.diario.aplicar(anterior);
      return this.devolver(anterior.cambios, referenciaPedido, 'existente');
    }
    const instantanea = await this.maestros.obtener();
    if (!instantanea) throw new Error('La caja no dispone de una copia.');
    validarVersionMaestros(solicitud, instantanea);
    const raiz = raizPedido(referenciaPedido);
    // Los números de ítem y cuenta son comunes a todas las cuentas de un pedido.
    const clave = 'numeracion-' + raiz;
    const numeracion = await this.diario.obtenerConVersion('estado-local', clave, instantanea.hastaSecuencia);
    const estadoMesas = await this.diario.obtenerConVersion('estado-local', 'mesas', instantanea.hastaSecuencia);
    const cuentas = await this.listarPedidos.ejecutar();
    const cuenta = cuentas.find(item => item.identificador === referenciaPedido);
    if (!cuenta) throw new Error('El pedido ya no está disponible.');
    validarModificacionPedido(solicitud, instantanea, cuenta);
    const pedido = cuenta.contenido;
    const previo = obtenerEstadoPrevio(pedido);
    const hermanas = cuentas.filter(item => raizPedido(item.identificador) === raiz);
    let ultimoItem = Math.max(numeracion.contenido?.ultimoItem ?? 0, ...hermanas.flatMap(item =>
      [item.contenido.UltimoItem ?? 0, ...item.contenido.ListaPedidoDet.map(detalle => detalle.Item)]));
    let ultimaCuenta = Math.max(numeracion.contenido?.ultimaCuenta ?? 0, ...hermanas.map(item =>
      Math.max(item.contenido.NroCuenta, item.contenido.UltimaCuenta ?? 0)));
    const cambios = [{ tipo: 'pedidos', identificador: referenciaPedido, versionEsperada: cuenta.version, contenido: pedido }];
    let impresas = [];
    let nroCuentaDestino;
    let porcentajeAplicado;
    if (accion === 'agregar-productos') {
      validarDetallesNuevos(solicitud.detalles, instantanea.maestros, pedido, true);
      impresas = solicitud.detalles.map(detalle => ({ ...detalle, Estado: 1, Item: ++ultimoItem, NroCuenta: pedido.NroCuenta }));
      pedido.ListaPedidoDet.push(...impresas);
    } else if (accion === 'dividir') {
      const lineas = lineasSeleccionadas(pedido, solicitud.items);
      if (lineas.length === previo.ListaPedidoDet.length) throw new Error('La cuenta de origen debe conservar algún producto.');
      nroCuentaDestino = ++ultimaCuenta;
      const destino = { ...pedido, NroCuenta: nroCuentaDestino, NombreCuenta: solicitud.nombreCuenta ?? '',
        ListaPedidoDet: lineas.map(detalle => ({ ...detalle, NroCuenta: nroCuentaDestino })) };
      pedido.ListaPedidoDet = pedido.ListaPedidoDet.filter(detalle => !lineas.includes(detalle));
      actualizarTotal(destino);
      cambios.push({ tipo: 'pedidos', identificador: raiz + (raiz.startsWith('ONLINE-') ? '-' : '-C') + nroCuentaDestino,
        versionEsperada: 0, contenido: destino });
    } else if (accion === 'descuento') {
      const { porcentaje, porProducto } = validarDescuento(solicitud, instantanea.maestros);
      porcentajeAplicado = porcentaje;
      const lineas = porProducto ? lineasSeleccionadas(pedido, [solicitud.item]) : pedido.ListaPedidoDet.filter(item => item.Estado === 1);
      for (const linea of lineas) {
        linea.MontoDescuento = Math.round((linea.Subtotal * porcentaje * 10) + Number.EPSILON) / 1000;
        linea.IdDescuento = solicitud.idDescuento;
        linea.NroCupon = solicitud.nroCupon ?? '';
      }
    } else {
      impresas = accion === 'anular-producto' ? lineasSeleccionadas(pedido, [solicitud.item]) : pedido.ListaPedidoDet.filter(item => item.Estado === 1);
      for (const linea of impresas) {
        linea.Estado = 0;
        linea.MotivoAnula = solicitud.motivo.trim();
        linea.UsuAnula = solicitud.idAutorizador ?? solicitud.idUsuario;
      }
      if (!pedido.ListaPedidoDet.some(item => item.Estado === 1)) {
        pedido.Estado = accion === 'anular-producto' && pedido.ListaPedidoDet.some(item => item.Estado === 2) ? 2 : 3;
        if (pedido.IdCanalVenta === 2) {
          const otras = cuentas.some(item => item.identificador !== referenciaPedido && item.contenido.IdEspacio === pedido.IdEspacio
            && [1, 6].includes(item.contenido.Estado));
          const mesas = estadoMesas.contenido?.datos ?? instantanea.maestros.mesas;
          cambios.push({ tipo: 'estado-local', identificador: 'mesas', versionEsperada: estadoMesas.version,
            contenido: { datos: mesas.map(mesa => mesa.IdEspacio === pedido.IdEspacio ? { ...mesa, Ocupado: otras ? 1 : 0 } : mesa) } });
        }
      }
    }
    actualizarTotal(pedido);
    cambios.push({ tipo: 'estado-local', identificador: clave, versionEsperada: numeracion.version, contenido: { ultimoItem, ultimaCuenta } });
    const impresion = impresas.length
      ? planificarImpresion(solicitud, instantanea.maestros, referenciaPedido, pedido, impresas, accion.startsWith('anular-'))
      : undefined;
    if (impresion) cambios.push(impresion);
    const resultado = await this.diario.aplicar({ id: idOperacion, cambios, operacion: { tipo: 'modificar-pedido',
      datos: { solicitud, previo, ...(impresion === null ? { impresionNoRequerida: true } : {}),
        ...(nroCuentaDestino ? { nroCuentaDestino } : {}), ...(porcentajeAplicado ? { porcentajeAplicado } : {}) } } }, async () => {
      if ((await this.maestros.obtener())?.version !== instantanea.version) throw new Error('La copia del pedido cambió.');
    }, instantanea.hastaSecuencia);
    return this.devolver(cambios, referenciaPedido, resultado);
  }

  async devolver(cambios, referenciaPedido, resultado) {
    const plan = cambios.find(item => item.identificador.startsWith('plan-'))?.contenido;
    if (plan) await recuperarProgreso(this.progreso, plan);
    const referenciaDestino = cambios.find(item => item.tipo === 'pedidos' && item.identificador !== referenciaPedido)?.identificador;
    return { referenciaPedido, resultado, ...(referenciaDestino ? { referenciaDestino } : {}), ...(plan ? { plan } : {}) };
  }
}

function raizPedido(referencia) {
  const coincidencia = /^(ONLINE-[1-9]\d*)-[1-9]\d*$|^(OFF-E[1-9]\d*-[a-f0-9-]{36})(?:-C[1-9]\d*)?$/.exec(referencia);
  if (!coincidencia) throw new Error('La referencia del pedido no es válida.');
  return coincidencia[1] ?? coincidencia[2];
}

function lineasSeleccionadas(pedido, items) {
  if (!Array.isArray(items) || !items.length || !items.every(Number.isSafeInteger) || new Set(items).size !== items.length) {
    throw new Error('Seleccione líneas distintas del pedido.');
  }
  const lineas = pedido.ListaPedidoDet.filter(item => item.Estado === 1 && items.includes(item.Item));
  if (lineas.length !== items.length) throw new Error('Algunos productos seleccionados ya no están activos.');
  return lineas;
}

function actualizarTotal(pedido) {
  const activas = pedido.ListaPedidoDet.filter(linea => linea.Estado === 1);
  pedido.Importe = Number(activas.reduce((total, linea) => total + linea.Subtotal, 0).toFixed(3));
  pedido.Dscto = Number(activas.reduce((total, linea) => total + (linea.MontoDescuento ?? 0), 0).toFixed(3));
  pedido.Total = Number((pedido.Importe - pedido.Dscto).toFixed(3));
}
