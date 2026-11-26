import { randomUUID } from 'node:crypto';
import { validarProgresoImpresionOffline } from '../validators/validar-progreso-impresion-offline.mjs';

/** Resuelve las áreas y deja una orden durable de impresión junto al movimiento del pedido. */
export function planificarImpresion(solicitud, maestros, numeroPedido, pedido, detalles, anulacion = false) {
  const usuario = maestros.usuarios.find(item => item.IdUsuario === solicitud.idUsuario);
  const mesa = maestros.mesas.find(item => item.IdEspacio === pedido.IdEspacio);
  const trabajos = new Map();
  const fechaUtc = new Date().toISOString();
  for (const linea of lineasImprimibles(detalles, maestros.productos)) {
    const producto = linea.producto;
    if (Object.hasOwn(linea, 'menu') && Array.isArray(producto?.AreasImpresion) && producto.AreasImpresion.length === 0) {
      continue;
    }
    if (!producto?.AreasImpresion?.length) throw new Error('El producto no tiene un área de impresión configurada.');
    for (const idArea of new Set(producto.AreasImpresion)) {
      const area = maestros.areas?.find(item => item.IdAreaImpresion === idArea);
      if (!area?.NombreImpresora?.trim() || !area.Descripcion?.trim()) {
        throw new Error('Falta la impresora del área del producto.');
      }
      const clave = !anulacion && producto.ExclusivoParaAnfitriona ? Symbol() : idArea;
      if (!trabajos.has(clave)) {
        trabajos.set(clave, { impresora: area.NombreImpresora.trim(), datos: {
          area: anulacion ? 'ANULACIÓN - ' + area.Descripcion : area.Descripcion,
          numeroPedido, idCanalVenta: pedido.IdCanalVenta, fechaUtc, idCaja: pedido.IdCaja,
          usuario: usuario.NombreUsuario, estacion: maestros.contexto?.identificadorEstacion ?? String(solicitud.idEstacion),
          etiquetaMozo: maestros.contexto?.paisISO2 === 'ES' ? 'Camarero' : 'Mozo',
          mozo: pedido.Mozo || maestros.usuarios.find(persona => persona.IdEmpleado === pedido.IdEmpleado)?.NombreEmpleado
            || usuario.NombreEmpleado || usuario.NombreUsuario,
          cliente: pedido.Cliente ?? '', mesa: mesa ? [mesa.Descripcion, mesa.Numero].filter(Boolean).join(' ') || String(mesa.IdEspacio) : '',
          personas: pedido.NroPax ?? 0, ambiente: mesa?.Ambiente ?? '',
          ...(maestros.contexto?.cultura ? { cultura: maestros.contexto.cultura } : {}), lineas: [],
        } });
      }
      const observacion = [linea.observacion, anulacion ? solicitud.motivo : null].filter(Boolean).join(' · ');
      const nombre = producto.NombreCompleto || producto.NombreCorto;
      trabajos.get(clave).datos.lineas.push({ descripcion: linea.menu ? nombre + ' (' + linea.menu + ')' : nombre,
        cantidad: linea.cantidad, observacion, anfitrionas: linea.anfitrionas });
    }
  }
  if (trabajos.size === 0) return null;
  const plan = { idOperacion: randomUUID(), idOperacionPedido: solicitud.idOperacion, idEstacion: solicitud.idEstacion,
    idUsuario: solicitud.idUsuario, numeroOffline: numeroPedido, trabajos: [...trabajos.values()] };
  validarProgresoImpresionOffline({ accion: 'crear', ...plan });
  return { tipo: 'estado-local', identificador: 'plan-' + solicitud.idOperacion.toLowerCase(), versionEsperada: 0,
    contenido: plan };
}

function* lineasImprimibles(detalles, productos) {
  for (const detalle of detalles) {
    const producto = productos.find(item => item.IdProducto === detalle.Producto?.IdProducto);
    if (!producto) throw new Error('El producto del pedido no está en la copia de impresión.');
    const anfitrionas = detalle.Anfitriona ?? '';
    if (producto.Tipo !== 1 || producto.IdSeccionMenu !== 0) {
      if (producto.Tipo === 1 && !(producto.IdSeccionMenu > 0 && producto.VentaIndividual)) {
        throw new Error('El producto del menú no se vende de forma individual.');
      }
      yield { producto, cantidad: detalle.Cantidad, observacion: detalle.Observacion, anfitrionas };
    }
    for (const menu of detalle.PedidoMenu ?? []) {
      if (menu.Estado === 0) continue;
      yield { producto: productos.find(item => item.IdProducto === menu.IdProductoSeccionMenu), cantidad: menu.Cantidad,
        menu: producto.NombreCompleto || producto.NombreCorto, observacion: menu.Observacion, anfitrionas: '' };
    }
    for (const extra of detalle.PedidoComplemento ?? []) {
      if (extra.Estado === 0) continue;
      yield { producto: productos.find(item => item.IdProducto === extra.IdProdComple), cantidad: extra.Cantidad,
        observacion: 'Complemento', anfitrionas: '' };
    }
  }
}

/** Un cierre entre el diario y los ficheros de progreso conserva el mismo plan al reanudar. */
export function recuperarProgreso(progreso, plan) {
  return progreso.ejecutarExclusivo(plan.idOperacionPedido, async actual => {
    if (actual) {
      if (JSON.stringify(actual.plan) !== JSON.stringify(plan)) throw new Error('El pedido ya tiene otro plan de impresión.');
      return { respuesta: actual };
    }
    const creado = { plan, estados: plan.trabajos.map(() => ({ estado: 'pendiente', idIntento: null, historial: [] })) };
    return { guardar: creado, respuesta: creado };
  });
}
