import { ConsumoTeoricoRealReporteComponent } from './consumo-teorico-real-reporte.component';

describe('ConsumoTeoricoRealReporteComponent', () => {
  function crearComponente(): ConsumoTeoricoRealReporteComponent {
    return new ConsumoTeoricoRealReporteComponent(
      { close: jasmine.createSpy('close') } as any,
      {} as any,
      {} as any,
    );
  }

  it('inicializa el rango con las fechas locales del navegador', () => {
    const component = crearComponente();

    expect(component.fechaDesde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(component.fechaHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
