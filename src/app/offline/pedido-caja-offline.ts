import { PedidoCab, ModoImpresionPedido } from '../models/pedido.models';
import { ContextoCaja, CuentaLocal } from './caja-offline-api.service';

/** Las líneas persistidas ya tienen un ítem y su propia comanda en el diario. */
export function prepararEnvioPedidoLocal(
  pedido: PedidoCab, cuenta: CuentaLocal | undefined, contexto: ContextoCaja, idEmpleado: number,
) {
  const detalles = pedido.ListaPedidoDet.filter(linea => !linea.Item).map(linea => ({
    ...linea,
    IdPedido: 0,
    Item: 0,
    Precio: Number(linea.Precio),
    Cantidad: Number(linea.Cantidad),
    NroCuenta: cuenta?.contenido.NroCuenta ?? 1,
    Ip: contexto.identificadorEstacion,
    IdEstacion: contexto.idEstacion,
    MontoDescuento: 0,
    Impuesto1: 0,
    PedidoComplemento: (linea.PedidoComplemento ?? []).map(complemento => ({
      ...complemento,
      IdPedido: 0,
      IdProdComple: complemento.ProductoComplemento.IdProducto,
    })),
    PedidoMenu: (linea.PedidoMenu ?? []).map(opcion => ({ ...opcion, IdPedido: 0 })),
  }));
  if (!detalles.length) throw new Error('Añade al menos un producto nuevo para enviar la comanda.');
  if (cuenta) {
    return { ruta: 'pedidos/modificar' as const, datos: {
      referenciaPedido: cuenta.identificador, versionPedido: cuenta.version, accion: 'agregar-productos', detalles,
    } };
  }
  const importe = Number(detalles.reduce((suma, linea) => suma + linea.Subtotal, 0).toFixed(3));
  return { ruta: 'pedidos' as const, datos: { pedido: {
    ...pedido, IdPedido: 0, NroCuenta: 1, IdEmpleado: idEmpleado, IdEstacion: contexto.idEstacion,
    Total: importe, Importe: importe, Dscto: 0, ModoImpresion: ModoImpresionPedido.DirectaQz, ListaPedidoDet: detalles,
  } } };
}
