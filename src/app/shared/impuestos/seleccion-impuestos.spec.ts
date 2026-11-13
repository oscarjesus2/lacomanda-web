import { ajustarSeleccionImpuestos } from './seleccion-impuestos';

describe('ajustarSeleccionImpuestos', () => {
  it('deja solo Ninguno cuando se selecciona después de otros impuestos', () => {
    expect(ajustarSeleccionImpuestos(
      ['IGV18', 'ICBPER30', 'NINGUNO_PE'], ['IGV18', 'ICBPER30'],
    )).toEqual(['NINGUNO_PE']);
  });

  it('quita Ninguno cuando se selecciona otro impuesto', () => {
    expect(ajustarSeleccionImpuestos(
      ['NINGUNO_ES', 'IVA21'], ['NINGUNO_ES'],
    )).toEqual(['IVA21']);
  });

  it('conserva la selección al desmarcar y permite varios impuestos normales', () => {
    expect(ajustarSeleccionImpuestos(['IGV18'], ['IGV18', 'ICBPER30']))
      .toEqual(['IGV18']);
    expect(ajustarSeleccionImpuestos(['IGV18', 'ICBPER30'], ['IGV18']))
      .toEqual(['IGV18', 'ICBPER30']);
    expect(ajustarSeleccionImpuestos([], ['NINGUNO_PE'])).toEqual([]);
  });
});
