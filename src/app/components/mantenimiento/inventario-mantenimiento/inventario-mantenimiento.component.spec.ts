import { InventarioMantenimientoComponent } from './inventario-mantenimiento.component';

describe('InventarioMantenimientoComponent', () => {
  it('muestra el instante en la zona horaria del tenant', () => {
    const component = new InventarioMantenimientoComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    component.zonaHoraria = 'America/Lima';

    expect(component.formatearFechaTenant('2026-10-12T03:30:00'))
      .toBe('11/10/2026 22:30');
  });

  it('muestra un guion para una fecha inválida', () => {
    const component = new InventarioMantenimientoComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    expect(component.formatearFechaTenant('fecha-invalida')).toBe('—');
  });
});
