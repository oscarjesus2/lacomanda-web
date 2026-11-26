import { validarNumeroPedidoOffline } from './validar-numero-pedido-offline.mjs';
import { validarUsuariosOffline } from './validar-usuarios-offline.mjs';
import { validarCajaTurnoOffline } from './validar-caja-turno-offline.mjs';
import { validarIdentidadComprador } from './validar-identidad-comprador-offline.mjs';

/** Valida los datos que se conservarán para emitir el comprobante al sincronizar. */
export function validarCobroPendienteOffline(solicitud, instantanea, pedido) {
  if (!solicitud || typeof solicitud !== 'object') throw new TypeError('La solicitud no es válida.');
  validarNumeroPedidoOffline(solicitud.idEstacion, solicitud.idOperacion);
  const usuario = validarUsuariosOffline(instantanea).find(item => item.IdUsuario === solicitud.idUsuario);
  if (!usuario || ![1, 2, 4].includes(usuario.IdNivel) || !(usuario.IdEmpleado > 0)) {
    throw new Error('El usuario seleccionado no está disponible.');
  }
  if (!pedido || ![1, 6].includes(pedido.Estado)) throw new Error('El pedido no está disponible para cobrar.');
  if (pedido.TieneAnticiposOnline) throw new Error('Este pedido contiene anticipos online y debe cobrarse con conexión.');
  const documento = solicitud.documento;
  const venta = documento?.venta;
  const pagos = documento?.listaPago;
  if (!venta || ![1, 2, 5, 9].includes(venta.IdTipoDocumento)
      || (instantanea.maestros.documentos && !instantanea.maestros.documentos.some(item => item.IdTipoDocumento === venta.IdTipoDocumento))
      || venta.IdCaja !== pedido.IdCaja || (venta.IdTurno !== undefined && venta.IdTurno !== pedido.IdTurno)
      || (instantanea.maestros.contexto && solicitud.idEstacion !== instantanea.maestros.contexto.idEstacion)
      || (venta.IdVenta ?? 0) !== 0 || documento.bTurnoIndependiente === true
      || !Number.isSafeInteger(venta.IdCaja) || venta.IdCaja <= 0
      || !Number.isFinite(venta.Importe) || venta.Importe < 0
      || !Number.isFinite(venta.Total) || venta.Total < 0
      || !Number.isFinite(venta.Propina) || venta.Propina < 0
      || (venta.NumDocumento ?? 0) !== 0 || (venta.Serie ?? '') !== '') {
    throw new TypeError('Los datos de la venta pendiente no son válidos.');
  }
  validarCajaTurnoOffline(instantanea.maestros, venta.IdCaja, pedido.IdTurno);
  if ((venta.IdTipoDocumento !== 9 || solicitud.correoComprobante) && (typeof solicitud.correoComprobante !== 'string'
      || solicitud.correoComprobante.trim().length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(solicitud.correoComprobante.trim()))) {
    throw new TypeError('Es obligatorio indicar un correo válido para el comprobante.');
  }
  if (typeof documento.usarClienteGenerico !== 'boolean'
      || (documento.usarClienteGenerico && documento.cliente != null)
      || (!documento.usarClienteGenerico && !documento.cliente)) {
    throw new TypeError('Los datos del cliente no son consistentes.');
  }
  validarIdentidadComprador(documento, instantanea.maestros);
  if (venta.VentaAlCredito === true) {
    const caja = instantanea.maestros.cajas?.find(item => item.IdCaja === venta.IdCaja);
    if (!caja?.PermiteVentaCredito || (pagos?.length ?? 0) !== 0 || documento.usarClienteGenerico || venta.Propina !== 0) {
      throw new Error('La venta al crédito no está permitida.');
    }
  } else {
    if (!Array.isArray(pagos) || pagos.length === 0) throw new Error('La venta debe incluir al menos un pago.');
    let total = 0;
    let propina = 0;
    for (const pago of pagos) {
      if (!Number.isSafeInteger(pago.IdTipoPago) || pago.IdTipoPago <= 0
          || pago.IdTipoPago === 8 || (pago.IdPago ?? 0) !== 0 || (pago.IdVenta ?? 0) !== 0
          || (instantanea.maestros.tipospago && !instantanea.maestros.tipospago.some(tipo => tipo.IdTipoPago === pago.IdTipoPago))
          || (pago.IdTipoPago === 3 && instantanea.maestros.tarjetas && !instantanea.maestros.tarjetas.some(t => t.IdTarjeta === pago.IdTarjeta))
          || (instantanea.maestros.monedas && !instantanea.maestros.monedas.some(moneda => moneda.IdMoneda === pago.IdMoneda))
          || !Number.isFinite(pago.MontoPagado) || pago.MontoPagado < 0
          || !Number.isFinite(pago.Vuelto) || pago.Vuelto < 0
          || !Number.isFinite(pago.Propina) || pago.Propina < 0
          || (venta.IdTipoDocumento === 9 && pago.IdTipoPago === 3)) {
        throw new Error('Los datos del pago no son válidos.');
      }
      total += pago.MontoPagado - pago.Vuelto + pago.Propina;
      propina += pago.Propina;
    }
    if (Math.abs(propina - venta.Propina) > 0.0100001 || Math.abs(total - venta.Total - venta.Propina) > 0.0100001) {
      throw new Error('Los pagos no cubren la venta o la propina no coincide.');
    }
  }
  if (!Array.isArray(pedido.ListaPedidoDet)
      || pedido.ListaPedidoDet.some(detalle => !detalle || ![0, 1, 2].includes(detalle.Estado))) {
    throw new Error('El detalle del pedido no es válido.');
  }
  const activos = pedido.ListaPedidoDet.filter(detalle => detalle.Estado === 1);
  if (activos.length === 0
      || activos.some(detalle => !Number.isFinite(detalle.Subtotal) || detalle.Subtotal < 0)) {
    throw new Error('El detalle del pedido no es válido.');
  }
  const totalPedido = activos.reduce((total, detalle) => total + detalle.Subtotal, 0);
  const descuento = activos.reduce((total, detalle) => total + (detalle.MontoDescuento ?? 0), 0);
  if (!Number.isFinite(totalPedido) || !Number.isFinite(descuento) || Math.abs(venta.Importe - totalPedido) > 0.0100001
      || Math.abs((venta.Dscto ?? 0) - descuento) > 0.0100001 || Math.abs(venta.Total - totalPedido + descuento) > 0.0100001) {
    throw new Error('El importe no coincide con el total del pedido.');
  }
}
