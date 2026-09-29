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
      IdTipoDocumento: 2,
      FechaDocumento: '2026-09-29',
      UsarClienteGenerico: true,
      Cliente: null,
      Detalles: [{ IdProducto: 10, Cantidad: 2, Precio: 5 }],
      Pagos: [{ IdTipoPago: 1, MontoPagado: 10 }],
    });

    expect(error).toBeNull();
  });
});
