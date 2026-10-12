import { ConsumoTeoricoRealReporteComponent } from './consumo-teorico-real-reporte.component';

describe('ConsumoTeoricoRealReporteComponent', () => {
  function crearComponente(): ConsumoTeoricoRealReporteComponent {
    return new ConsumoTeoricoRealReporteComponent(
      { close: jasmine.createSpy('close') } as any,
      {} as any,
      {} as any,
    );
  }

  it('formatea la fecha operativa del inventario sin desplazarla por zona horaria', () => {
    const component = crearComponente();

    expect(component.formatearFechaConsulta('2026-10-12')).toBe('12/10/2026');
    expect(component.formatearFechaConsulta('2026-10-12T00:00:00+02:00'))
      .toBe('12/10/2026');
  });

  it('muestra un guion cuando la fecha no está disponible', () => {
    const component = crearComponente();

    expect(component.formatearFechaConsulta(null)).toBe('—');
  });
});
