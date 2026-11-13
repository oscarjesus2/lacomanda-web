import { isMoment, Moment } from 'moment';

export type FechaFiltro = Date | Moment | string;

export function fechaFiltroParaApi(fecha: FechaFiltro): string {
  if (isMoment(fecha)) {
    return fecha.format('YYYY-MM-DD');
  }
  if (fecha instanceof Date) {
    const year = fecha.getFullYear();
    const month = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const day = `${fecha.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return fecha;
}
