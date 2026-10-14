import { FormasPagoVentaComponent } from './formas-pago-venta.component';

describe('FormasPagoVentaComponent', () => {
  function crear(): FormasPagoVentaComponent {
    return new FormasPagoVentaComponent(
      { getTarjeta: () => ({ subscribe: () => undefined }) } as any,
      { getMonedaPorPais: () => ({ subscribe: () => undefined }) } as any,
      { open: () => undefined } as any,
    );
  }

  it('elimina propina de transferencias al cambiar la forma de pago', () => {
    const componente = crear();
    const pago = {
      IdTipoPago: 6,
      Propina: 12,
      Vuelto: 4,
      Observacion: 'OP-123',
      IdBanco: 1,
    } as any;

    componente.cambiarFormaPago(pago);

    expect(pago.Propina).toBe(0);
    expect(pago.Vuelto).toBe(0);
  });

  it('no envía propina en una transferencia heredada', () => {
    const componente = crear();
    componente.pagos = [{
      IdTipoPago: 6,
      Propina: 12,
      Vuelto: 0,
      MontoPagado: 30,
      MontoRecibido: 30,
      TipoCambio: 1,
      Observacion: 'OP-123',
      IdBanco: 1,
    } as any];

    const [pago] = componente.normalizarParaSolicitud();

    expect(pago.Propina).toBe(0);
  });
});
