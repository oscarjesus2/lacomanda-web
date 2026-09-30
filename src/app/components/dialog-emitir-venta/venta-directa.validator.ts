import { EmitirVentaDirectaRequest } from 'src/app/models/venta-directa.models';

export interface VentaDirectaBorrador {
  fechaDocumento: Date | null | undefined;
  detalles: ReadonlyArray<{
    IdProducto: number;
    Qty: number;
    Precio: number;
  }>;
}

export function validarBorradorVentaDirecta(
  borrador: VentaDirectaBorrador,
): string | null {
  if (!borrador.fechaDocumento) {
    return 'Selecciona la fecha del comprobante.';
  }

  if (borrador.detalles.length === 0) {
    return 'Agrega al menos un producto o servicio.';
  }

  if (borrador.detalles.some(detalle =>
      detalle.IdProducto <= 0 || detalle.Qty <= 0 || detalle.Precio <= 0)) {
    return 'Todos los productos deben tener cantidad y precio mayores que cero.';
  }

  return null;
}

export function validarSolicitudVentaDirecta(
  request: EmitirVentaDirectaRequest,
): string | null {
  if (request.IdCaja <= 0) {
    return 'Selecciona la caja de la venta.';
  }

  if (request.IdTipoDocumento <= 0) {
    return 'Selecciona el tipo de comprobante.';
  }

  if (!request.UsarClienteGenerico && !request.Cliente) {
    return 'Completa los datos del cliente.';
  }

  const errorBorrador = validarBorradorVentaDirecta({
    fechaDocumento: request.FechaDocumento
      ? new Date(`${request.FechaDocumento}T00:00:00`)
      : null,
    detalles: request.Detalles.map(detalle => ({
      IdProducto: detalle.IdProducto,
      Qty: detalle.Cantidad,
      Precio: detalle.Precio,
    })),
  });
  if (errorBorrador) return errorBorrador;

  const total = request.Detalles.reduce(
    (acumulado, detalle) => acumulado + detalle.Cantidad * detalle.Precio,
    0,
  );
  const pagado = request.Pagos.reduce(
    (acumulado, pago) => acumulado + pago.MontoPagado,
    0,
  );
  if (request.Pagos.length === 0 || pagado + 0.01 < total) {
    return 'El pago registrado no cubre el total de la venta.';
  }

  return null;
}
