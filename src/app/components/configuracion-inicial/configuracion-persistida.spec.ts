import { esConfiguracionPersistida } from './configuracion-persistida';

describe('esConfiguracionPersistida', () => {
  it('rechaza valores ausentes y la propuesta inicial con identificador cero', () => {
    expect(esConfiguracionPersistida(null)).toBeFalse();
    expect(esConfiguracionPersistida(undefined)).toBeFalse();
    expect(esConfiguracionPersistida({ IdConfig: 0 })).toBeFalse();
  });

  it('acepta únicamente una configuración guardada', () => {
    expect(esConfiguracionPersistida({ IdConfig: 1 })).toBeTrue();
    expect(esConfiguracionPersistida({ IdConfig: 25 })).toBeTrue();
  });
});
