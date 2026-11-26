import { validarNumeroPedidoOffline } from './validar-numero-pedido-offline.mjs';
import { validarUsuariosOffline } from './validar-usuarios-offline.mjs';
import { validarCajaTurnoOffline } from './validar-caja-turno-offline.mjs';
import { validarSeleccionesProducto } from './validar-selecciones-producto-offline.mjs';

/** Comprueba los datos mínimos y maestros disponibles antes de escribir. */
export function validarNuevoPedidoOffline(solicitud, instantanea, mesas) {
  if (!solicitud || typeof solicitud !== 'object') throw new TypeError('La solicitud no es válida.');
  validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idOperacion);
  const usuario = validarUsuariosOffline(instantanea).find(item => item.IdUsuario === solicitud.idUsuario);
  if (!usuario) throw new Error('El usuario seleccionado no está disponible.');
  const pedido = solicitud.pedido;
  if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido)
      || pedido.IdPedido !== 0 || !Number.isSafeInteger(pedido.IdCaja) || pedido.IdCaja <= 0
      || !Number.isSafeInteger(pedido.IdTurno) || pedido.IdTurno <= 0
      || !Number.isSafeInteger(pedido.IdEmpleado) || pedido.IdEmpleado <= 0
      || ![2, 3, 4].includes(pedido.IdCanalVenta)
      || !Array.isArray(pedido.ListaPedidoDet) || pedido.ListaPedidoDet.length === 0) {
    throw new TypeError('Los datos del nuevo pedido no son válidos.');
  }
  if (!Array.isArray(instantanea?.maestros?.productos) || !Array.isArray(mesas)) {
    throw new Error('Los maestros de productos y mesas no están preparados.');
  }
  if (pedido.IdEmpleado !== usuario.IdEmpleado || (pedido.NroCuenta ?? 1) !== 1) {
    throw new Error('El empleado o la cuenta no corresponden al nuevo pedido.');
  }
  const caja = instantanea.maestros.cajas?.find(item => item.IdCaja === pedido.IdCaja);
  if (caja?.CanalesVenta && !caja.CanalesVenta.includes(pedido.IdCanalVenta)) {
    throw new Error('El canal de venta no está habilitado para esta caja.');
  }
  const contexto = instantanea.maestros.contexto;
  if (contexto && (contexto.idEstacion !== solicitud.idEstacion || contexto.idCaja !== pedido.IdCaja)) {
    throw new Error('La solicitud no corresponde a la estación de caja.');
  }
  validarCajaTurnoOffline(instantanea.maestros, pedido.IdCaja, pedido.IdTurno);
  if (pedido.IdCanalVenta === 2) {
    const mesa = mesas.find(item => item.IdEspacio === pedido.IdEspacio);
    if (!mesa || mesa.Activo !== true) throw new Error('La mesa no está disponible.');
    if (mesa.Ocupado !== 0) throw new Error('La mesa ya está ocupada.');
  }
  if (pedido.IdCanalVenta === 4) {
    const socio = pedido.IdSocioNegocio > 0;
    const cliente = pedido.IdClienteDelivery > 0;
    const direccion = pedido.ItemClienteDelivery > 0;
    if (cliente !== direccion || socio === (cliente && direccion)
        || (socio && (typeof pedido.Cliente !== 'string' || !pedido.Cliente.trim()))) {
      throw new Error('Los datos del cliente de delivery no son válidos.');
    }
    const { socios, clientesdelivery } = instantanea.maestros;
    if ((socio && socios && !socios.some(item => item.IdSocioNegocio === pedido.IdSocioNegocio))
        || (cliente && clientesdelivery && !clientesdelivery.some(item => item.IdCliente === pedido.IdClienteDelivery && item.Item === pedido.ItemClienteDelivery))) {
      throw new Error('El socio o la dirección del delivery no están disponibles.');
    }
  }
  validarDetallesNuevos(pedido.ListaPedidoDet, instantanea.maestros, pedido);
  const importe = Number(pedido.ListaPedidoDet.reduce((total, linea) => total + linea.Subtotal, 0).toFixed(3));
  if (!Number.isFinite(importe) || (pedido.Dscto ?? 0) !== 0 || [pedido.Importe, pedido.Total].some(valor =>
    valor !== undefined && (!Number.isFinite(valor) || Math.abs(valor - importe) > 0.01))) {
    throw new Error('El total del pedido no coincide con sus productos.');
  }
  return importe;
}

export function validarDetallesNuevos(detalles, maestros, pedido, esAmpliacion = false) {
  if (!Array.isArray(detalles) || !detalles.length) throw new TypeError('Debe incluir productos en el pedido.');
  const destino = pedido.IdCanalVenta === 4 && pedido.IdClienteDelivery > 0
    ? maestros.clientesdelivery?.find(cliente =>
        cliente.IdCliente === pedido.IdClienteDelivery && cliente.Item === pedido.ItemClienteDelivery)
    : undefined;
  if (pedido.IdCanalVenta === 4) {
    const cargo = maestros.productos.find(producto => producto.EsCargoDelivery);
    const lineasCargo = cargo ? detalles.filter(linea => linea?.Producto?.IdProducto === cargo.IdProducto) : [];
    const cantidadEsperada = !esAmpliacion && destino?.PrecioDelivery > 0 ? 1 : 0;
    if (lineasCargo.length !== cantidadEsperada) {
      throw new Error('El cargo por delivery debe coincidir con la tarifa del destino y aplicarse una sola vez en el pedido inicial.');
    }
  }
  for (const detalle of detalles) {
    const producto = maestros.productos.find(item => item.IdProducto === detalle?.Producto?.IdProducto);
    const esCargoDelDestino = producto?.EsCargoDelivery && destino;
    const precio = esCargoDelDestino ? destino.PrecioDelivery :
      producto?.PreciosSocio?.find(item => item.IdSocioNegocio === pedido.IdSocioNegocio)?.Precio ?? producto?.Precio;
    if (!producto || producto.Activo !== true || (producto.Tipo === 1 && producto.IdSeccionMenu > 0 && !producto.VentaIndividual)
        || detalle.IdPedido !== 0 || (detalle.Item ?? 0) !== 0
        || (maestros.contexto && (detalle.Ip !== maestros.contexto.identificadorEstacion || detalle.IdEstacion !== maestros.contexto.idEstacion))
        || !Number.isSafeInteger(detalle.Cantidad) || detalle.Cantidad <= 0
        || !Number.isFinite(detalle.Precio) || detalle.Precio <= 0
        || (producto.ExclusivoParaAnfitriona && !detalle.Anfitriona?.trim())
        || (esCargoDelDestino && (!Number.isFinite(precio) || detalle.Cantidad !== 1))
        || (precio !== undefined && (esCargoDelDestino || !producto.SinPrecio) && Math.abs(precio - detalle.Precio) > 0.00001)
        || (!esCargoDelDestino && producto.SinPrecio && detalle.Precio < (producto.PrecioMinimo ?? 0))
        || (detalle.MontoDescuento ?? 0) !== 0 || (detalle.IdDescuento ?? 0) !== 0
        || !Number.isFinite(detalle.Subtotal) || detalle.Subtotal < 0
        || Math.abs((detalle.Precio * detalle.Cantidad) - detalle.Subtotal) > 0.0100001) {
      throw new Error('El pedido contiene un producto o detalle no válido.');
    }
    validarSeleccionesProducto(detalle, producto, maestros.productos);
  }
}
