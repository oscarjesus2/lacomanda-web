import { NivelUsuarioEnum } from 'src/app/enums/enum';
import { dividirPorMes, porcentajeMerma, puedeVerDashboardAlmacen } from './dashboard-almacen.utils';

describe('Dashboard gerencial de almacén', () => {
  it('autoriza al gerente, al soporte y solo al administrador con permiso', () => {
    expect(puedeVerDashboardAlmacen({ Activo: true, IdNivel: NivelUsuarioEnum.Gerente } as any)).toBeTrue();
    expect(puedeVerDashboardAlmacen({ Activo: true, EsUsuarioSoporteLaComanda: true } as any)).toBeTrue();
    expect(puedeVerDashboardAlmacen({ Activo: true, IdNivel: NivelUsuarioEnum.Administrador, PuedeVerDashboardReportes: true } as any)).toBeTrue();
    expect(puedeVerDashboardAlmacen({ Activo: true, IdNivel: NivelUsuarioEnum.Administrador, PuedeVerDashboardReportes: false } as any)).toBeFalse();
    expect(puedeVerDashboardAlmacen({ Activo: false, IdNivel: NivelUsuarioEnum.Gerente } as any)).toBeFalse();
  });
  it('respeta los meses parciales y el cambio de año', () => {
    expect(dividirPorMes('2026-12-15', '2027-02-10')).toEqual([
      { desde: '2026-12-15', hasta: '2026-12-31', etiqueta: '12/2026' },
      { desde: '2027-01-01', hasta: '2027-01-31', etiqueta: '01/2027' },
      { desde: '2027-02-01', hasta: '2027-02-10', etiqueta: '02/2027' },
    ]);
    expect(dividirPorMes('2026-02-10', '2026-01-01')).toEqual([]);
  });
  it('calcula la merma ponderada y no inventa porcentaje sin cantidad bruta', () => {
    expect(porcentajeMerma([{ CantidadBruta: 10, Merma: 2 }, { CantidadBruta: 30, Merma: 3 }])).toBe(12.5);
    expect(porcentajeMerma([])).toBeNull();
  });
});
