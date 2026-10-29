import { Usuario } from 'src/app/models/usuario.models';
import { NivelUsuarioEnum } from 'src/app/enums/enum';

export function puedeVerDashboardAlmacen(usuario: Usuario | null | undefined): boolean {
  return !!usuario?.Activo && (usuario.EsUsuarioSoporteLaComanda === true ||
    usuario.IdNivel === NivelUsuarioEnum.Gerente ||
    (usuario.IdNivel === NivelUsuarioEnum.Administrador && usuario.PuedeVerDashboardReportes === true));
}

export interface RangoMensual { desde: string; hasta: string; etiqueta: string; }

/** Los meses parciales respetan el rango seleccionado, en hora local. */
export function dividirPorMes(desde: string, hasta: string): RangoMensual[] {
  const [y, m, d] = desde.split('-').map(Number);
  const inicio = new Date(y, m - 1, d);
  const [yf, mf, df] = hasta.split('-').map(Number);
  const fin = new Date(yf, mf - 1, df);
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) ||
      inicio.getFullYear() !== y || inicio.getMonth() !== m - 1 || inicio.getDate() !== d ||
      fin.getFullYear() !== yf || fin.getMonth() !== mf - 1 || fin.getDate() !== df || inicio > fin) return [];
  const aTexto = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  const rangos: RangoMensual[] = [];
  let actual = inicio;
  while (actual <= fin && rangos.length <= 12) {
    const ultimo = new Date(actual.getFullYear(), actual.getMonth() + 1, 0);
    const corte = ultimo < fin ? ultimo : fin;
    rangos.push({ desde: aTexto(actual), hasta: aTexto(corte), etiqueta: `${String(actual.getMonth() + 1).padStart(2, '0')}/${actual.getFullYear()}` });
    actual = new Date(actual.getFullYear(), actual.getMonth() + 1, 1);
  }
  return rangos;
}

export function porcentajeMerma(filas: { CantidadBruta: number; Merma: number }[]): number | null {
  const bruto = filas.reduce((total, fila) => total + fila.CantidadBruta, 0);
  return bruto > 0 ? filas.reduce((total, fila) => total + fila.Merma, 0) * 100 / bruto : null;
}
