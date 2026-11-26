import { validarNumeroPedidoOffline } from './validar-numero-pedido-offline.mjs';
import { validarCajaTurnoOffline } from './validar-caja-turno-offline.mjs';
import { validarUsuariosOffline } from './validar-usuarios-offline.mjs';

export function validarModificacionPedido(solicitud, instantanea, cuenta) {
  validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idOperacion);
  if (!Number.isSafeInteger(solicitud.versionPedido) || solicitud.versionPedido < 0 || cuenta.version !== solicitud.versionPedido
      || cuenta.contenido?.Estado !== 1) throw new Error('El pedido ha cambiado o ya no está activo.');
  validarCajaTurnoOffline(instantanea.maestros, cuenta.contenido.IdCaja, cuenta.contenido.IdTurno);
  const usuarios = validarUsuariosOffline(instantanea);
  const actor = usuarios.find(item => item.IdUsuario === solicitud.idUsuario);
  if (!actor) throw new Error('El usuario seleccionado no está disponible.');
  if (instantanea.maestros.contexto && instantanea.maestros.contexto.idEstacion !== solicitud.idEstacion) {
    throw new Error('El pedido no pertenece a esta estación.');
  }
  if (solicitud.accion === 'dividir' && cuenta.contenido.IdCanalVenta !== 2) throw new Error('Solo se pueden dividir cuentas de mesa.');
  if (solicitud.accion === 'dividir' && instantanea.maestros.cajas.find(c => c.IdCaja === cuenta.contenido.IdCaja)?.PermiteDividirPedido === false) {
    throw new Error('La caja no permite dividir cuentas.');
  }
  if (solicitud.accion === 'agregar-productos' && cuenta.contenido.IdCanalVenta === 2
      && ![1, 4].includes(actor.IdNivel) && actor.IdEmpleado !== cuenta.contenido.IdEmpleado) {
    throw new Error('La mesa no está asignada a este empleado.');
  }
  if (!['agregar-productos', 'anular-producto', 'anular-pedido', 'descuento', 'dividir'].includes(solicitud.accion)) {
    throw new TypeError('La modificación de pedido no es válida.');
  }
  if (solicitud.accion !== 'descuento' && !solicitud.accion.startsWith('anular-')) return;
  if (solicitud.idAutorizador != null && solicitud.idAutorizador !== actor.IdUsuario) {
    throw new Error('La operación debe realizarla el usuario que la autoriza en caja.');
  }
  const gerente = [1, 4].includes(actor.IdNivel);
  const cajero = actor.IdNivel === 2;
  const aprueba = gerente || (cajero && actor.PuedeAprobarSolicitudes);
  const descuenta = gerente || (cajero && actor.PuedeAplicarDescuento);
  if (solicitud.accion === 'descuento') {
    if (!descuenta) throw new Error('El usuario no puede autorizar descuentos.');
  } else {
    if (!aprueba) throw new Error('La anulación requiere un usuario autorizado.');
    if (typeof solicitud.motivo !== 'string' || !solicitud.motivo.trim() || solicitud.motivo.trim().length > 100) {
      throw new TypeError('Indique un motivo de anulación de hasta 100 caracteres.');
    }
  }
}

export function obtenerEstadoPrevio(pedido) {
  const lineas = pedido.ListaPedidoDet?.filter(item => item.Estado === 1).map(detalle => ({
    Item: detalle.Item, IdProducto: detalle.Producto?.IdProducto, Cantidad: detalle.Cantidad, Estado: detalle.Estado,
    Precio: detalle.Precio, Subtotal: detalle.Subtotal, MontoDescuento: detalle.MontoDescuento ?? 0,
  }));
  if (!lineas?.length || lineas.some(linea => !Number.isSafeInteger(linea.Item) || linea.Item <= 0
      || !Number.isSafeInteger(linea.IdProducto) || linea.IdProducto <= 0 || !Number.isSafeInteger(linea.Cantidad) || linea.Cantidad <= 0
      || ![linea.Precio, linea.Subtotal, linea.MontoDescuento].every(valor => Number.isFinite(valor) && valor >= 0))
      || new Set(lineas.map(detalle => detalle.Item)).size !== lineas.length) {
    throw new Error('La copia del pedido no tiene detalles activos válidos.');
  }
  return { IdEspacio: pedido.IdEspacio ?? 0, Estado: pedido.Estado, IdCaja: pedido.IdCaja, IdTurno: pedido.IdTurno,
    ListaPedidoDet: lineas.sort((a, b) => a.Item - b.Item) };
}

export function validarDescuento(solicitud, maestros) {
  const descuento = maestros.descuentos?.find(item => item.IdDescuento === solicitud.idDescuento && item.Activo);
  if (!descuento || ![1, 2, 3].includes(descuento.TipoDescuento)) throw new Error('El descuento no está disponible.');
  const porcentaje = descuento.TipoDescuento === 3 ? solicitud.porcentaje : descuento.Porcentaje;
  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100
      || (solicitud.porcentaje !== undefined && solicitud.porcentaje !== porcentaje)) throw new Error('El porcentaje de descuento no es válido.');
  return { porcentaje, porProducto: descuento.TipoDescuento === 1 };
}
