import { ConsumoAreaReporteComponent } from './consumo-area-reporte.component';

describe('ConsumoAreaReporteComponent', () => {
  function crearComponente(): ConsumoAreaReporteComponent {
    return new ConsumoAreaReporteComponent(
      { close: jasmine.createSpy('close') } as any,
      {} as any,
      {} as any,
    );
  }

  it('formatea fechas de calendario sin desplazarlas por zona horaria', () => {
    const component = crearComponente();

    expect(component.formatearFechaConsulta('2026-10-01')).toBe('01/10/2026');
    expect(component.formatearFechaConsulta('2026-10-12')).toBe('12/10/2026');
  });

  it('también acepta una fecha ISO con hora sin alterar el día', () => {
    const component = crearComponente();

    expect(component.formatearFechaConsulta('2026-10-12T00:00:00+02:00'))
      .toBe('12/10/2026');
    expect(component.formatearFechaConsulta(null)).toBe('—');
  });
});
