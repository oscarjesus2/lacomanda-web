import { esCajaDisponibleParaVentaDirecta } from './caja-venta-directa.utils';
import { CanalVentaEnum } from 'src/app/enums/enum';

describe('esCajaDisponibleParaVentaDirecta', () => {
  function caja(overrides: Record<string, unknown> = {}): any {
    return {
      Activo: true,
      TurnoAbierto: { IdTurno: 12 },
      IdCanalesVenta: [CanalVentaEnum.VENTA_DIRECTA],
      ...overrides,
    };
  }

  it('acepta una caja activa, con turno y Venta directa', () => {
    expect(esCajaDisponibleParaVentaDirecta(caja())).toBeTrue();
  });

  it('rechaza una caja sin turno, inactiva o sin el canal de Venta directa', () => {
    expect(esCajaDisponibleParaVentaDirecta(caja({ TurnoAbierto: undefined }))).toBeFalse();
    expect(esCajaDisponibleParaVentaDirecta(caja({ Activo: false }))).toBeFalse();
    expect(esCajaDisponibleParaVentaDirecta(caja({ IdCanalesVenta: [2] }))).toBeFalse();
  });
});
