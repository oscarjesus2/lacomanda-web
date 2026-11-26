import { EnumTipoDocumento, TipoPagoEnum } from '../enums/enum';
import { PedidoCab } from '../models/pedido.models';
import { Pago } from '../models/pago.models';
import { Usuario } from '../models/usuario.models';
import { ContextoCaja, MaestrosCaja } from './caja-offline-api.service';

export interface DatosClienteCobro {
  idDocumento: number;
  correo: string;
  tipoIdentidad: string;
  identificacion: string;
  razonSocial: string;
  direccion: string;
  credito: boolean;
}

export function centimos(valor: number): number { return Math.round((valor + Number.EPSILON) * 100); }

type PagoCaja = Pick<Pago, 'IdTipoPago' | 'IdMoneda' | 'MontoPagado' | 'MontoRecibido' | 'Propina' | 'Vuelto' | 'IdTarjeta' | 'Autorizacion' | 'TipoCambio'>;

export function requiereIdentidadCaja(pais: string, idDocumento: number, total: number): boolean {
  return idDocumento === EnumTipoDocumento.FacturaVenta
    || (pais === 'ES' && idDocumento === EnumTipoDocumento.FacturaSimplificada && total > 400)
    || (pais === 'PE' && idDocumento === EnumTipoDocumento.BoletaVenta && total > 700);
}

export function prepararDocumentoPendiente(cobro: DatosClienteCobro, pedido: PedidoCab, usuario: Usuario,
  contexto: ContextoCaja, maestros: MaestrosCaja, listaPago: PagoCaja[]) {
  const activos = pedido.ListaPedidoDet.filter(linea => linea.Estado === 1);
  const importe = activos.reduce((suma, linea) => suma + centimos(linea.Subtotal), 0) / 100;
  const total = Number(pedido.Total);
  if (!activos.length || !Number.isFinite(total) || total < 0) throw new Error('La cuenta no tiene un total válido.');
  if (!maestros.documentos.some(doc => doc.IdTipoDocumento === cobro.idDocumento)) throw new Error('Selecciona un documento de la caja.');
  if (cobro.idDocumento !== EnumTipoDocumento.Express && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cobro.correo.trim())) {
    throw new Error('Indica el correo al que se enviará el comprobante al recuperar la conexión.');
  }
  const esFactura = cobro.idDocumento === EnumTipoDocumento.FacturaVenta;
  const identidadObligatoria = requiereIdentidadCaja(contexto.paisISO2, cobro.idDocumento, total);
  const identificado = identidadObligatoria || !!cobro.identificacion.trim();
  if (identificado && (!cobro.tipoIdentidad.trim() || !cobro.identificacion.trim() || !cobro.razonSocial.trim()
      || (esFactura && !cobro.direccion.trim()))) throw new Error('Completa los datos fiscales del cliente.');
  const importes = listaPago.flatMap(p => [p.MontoPagado, p.MontoRecibido, p.Vuelto, p.Propina]);
  if (importes.some(valor => !Number.isFinite(valor) || valor < 0 || Math.abs(valor * 100 - centimos(valor)) > 0.00001)) {
    throw new Error('Los importes deben ser positivos, con un máximo de dos decimales.');
  }
  const caja = maestros.cajas.find(item => item.IdCaja === contexto.idCaja);
  if (cobro.credito && (!caja?.PermiteVentaCredito || !identificado || listaPago.length)) {
    throw new Error('El crédito requiere una caja habilitada y un cliente identificado.');
  }
  for (const pago of listaPago) {
    if (!maestros.tiposPago.some(t => t.IdTipoPago === pago.IdTipoPago)
      || !maestros.monedas.some(m => m.IdMoneda === pago.IdMoneda)
      || (pago.IdTipoPago === TipoPagoEnum.Tarjeta && (cobro.idDocumento === EnumTipoDocumento.Express
        || !maestros.tarjetas.some(t => t.IdTarjeta === pago.IdTarjeta)))) {
      throw new Error('El medio de pago no está disponible para este documento.');
    }
  }
  const pagado = listaPago.reduce((suma, pago) => suma + centimos(pago.MontoPagado) - centimos(pago.Vuelto), 0);
  if (!cobro.credito && (!listaPago.length || pagado !== centimos(total))) throw new Error('Revisa los importes del cobro.');
  const propina = listaPago.reduce((suma, pago) => suma + centimos(pago.Propina), 0);
  return {
    usarClienteGenerico: !identificado,
    cliente: identificado ? { IdTipoIdentidad: cobro.tipoIdentidad.trim(), NumeroIdentificacion: cobro.identificacion.trim(),
      RazonSocial: cobro.razonSocial.trim(), Direccion: cobro.direccion.trim(), Email: cobro.correo.trim() } : null,
    venta: { IdTipoDocumento: cobro.idDocumento, IdCaja: contexto.idCaja, IdTurno: pedido.IdTurno,
      IdPedido: pedido.IdPedido, NroCuenta: pedido.NroCuenta, Importe: importe, Total: total, Propina: propina / 100,
      Dscto: pedido.Dscto || 0, Impuesto1: activos.reduce((suma, linea) => suma + centimos(linea.Impuesto1 || 0), 0) / 100,
      NumDocumento: 0, Serie: '', VentaAlCredito: cobro.credito, UsuRegistra: usuario.IdUsuario, Estado: 1 },
    listaPago,
  };
}
