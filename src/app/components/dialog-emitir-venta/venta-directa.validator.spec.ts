import {
  validarBorradorVentaDirecta,
  validarSolicitudVentaDirecta,
} from './venta-directa.validator';

describe('validaciones de venta directa', () => {
  it('rechaza una venta sin productos', () => {
    const error = validarBorradorVentaDirecta({
      fechaDocumento: new Date(2026, 8, 29),
      detalles: [],
    });

    expect(error).toContain('producto');
  });

  it('acepta una solicitud completa y pagada', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 2, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 10 }],
    });

    expect(error).toBeNull();
  });

  it('rechaza una solicitud sin caja', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 0,
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 1, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 5 }],
    });

    expect(error).toContain('caja');
  });

  it('rechaza un borrador sin fecha', () => {
    const error = validarBorradorVentaDirecta({
      fechaDocumento: null,
      detalles: [{ IdProducto: 10, Qty: 1, Precio: 5 }],
    });

    expect(error).toContain('fecha');
  });

  it('rechaza productos con cantidad o precio inválidos', () => {
    const error = validarBorradorVentaDirecta({
      fechaDocumento: new Date(2026, 8, 29),
      detalles: [{ IdProducto: 10, Qty: 0, Precio: 5 }],
    });

    expect(error).toContain('mayores que cero');
  });

  it('rechaza un precio inferior al mínimo configurado del producto', () => {
    const error = validarBorradorVentaDirecta({
      fechaDocumento: new Date(2026, 8, 29),
      detalles: [{
        IdProducto: 10,
        Producto: 'Revisión documental',
        Qty: 1,
        Precio: 10,
        PrecioMinimo: 94.4,
      }],
    });

    expect(error).toContain('Revisión documental');
    expect(error).toContain('94.40');
  });

  it('acepta un precio igual al mínimo configurado del producto', () => {
    const error = validarBorradorVentaDirecta({
      fechaDocumento: new Date(2026, 8, 29),
      detalles: [{
        IdProducto: 10,
        Producto: 'Revisión documental',
        Qty: 1,
        Precio: 94.4,
        PrecioMinimo: 94.4,
      }],
    });

    expect(error).toBeNull();
  });

  it('rechaza una solicitud sin tipo de comprobante', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 0,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 1, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 5 }],
    });

    expect(error).toContain('comprobante');
  });

  it('exige cliente cuando no se usa el genérico', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: false,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 1, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 5 }],
    });

    expect(error).toContain('cliente');
  });

  it('propaga la validación del borrador de la solicitud', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 2,
      FechaDocumento: '',
      UsarClienteGenerico: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 1, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 5 }],
    });

    expect(error).toContain('fecha');
  });

  it('rechaza una venta sin pagos suficientes', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 2, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 9 }],
    });

    expect(error).toContain('pago');
  });

  it('acepta una venta al crédito sin formas de pago', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      VentaAlCredito: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 2, Precio: 5 }],
      Pagos: [],
    });

    expect(error).toBeNull();
  });

  it('rechaza pagos mezclados con la modalidad al crédito', () => {
    const error = validarSolicitudVentaDirecta({
      IdCaja: 3,
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      VentaAlCredito: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 1, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 5 }],
    });

    expect(error).toContain('no debe incluir');
  });
});
