import * as moment from 'moment';
import { horaLocal, instanteLocal } from './fecha-hora-local';

describe('Fecha y hora local', () => {
  it('conserva la fecha y hora elegidas al convertir el instante a UTC', () => {
    const instante = instanteLocal(moment('2026-10-21', 'YYYY-MM-DD'), '15:32:47');

    expect(instante?.toISOString()).toBe(new Date(2026, 9, 21, 15, 32, 47).toISOString());
    expect(horaLocal(instante!)).toBe('15:32:47');
  });

  it('rechaza fechas y horas inválidas', () => {
    expect(instanteLocal('2026-02-30', '15:00')).toBeNull();
    expect(instanteLocal('2026-10-21', '25:00')).toBeNull();
    expect(instanteLocal('2026-10-21', '')).toBeNull();
  });
});
