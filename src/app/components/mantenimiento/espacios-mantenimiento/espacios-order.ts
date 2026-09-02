import { Espacios } from 'src/app/models/espacios.models';

export function ordenarEspaciosPorTipoYNumero(espacios: Espacios[]): Espacios[] {
  return [...espacios].sort((left, right) => {
    const porTipo = (left.Descripcion || '').trim().localeCompare(
      (right.Descripcion || '').trim(),
      'es',
      { sensitivity: 'base', numeric: true }
    );
    if (porTipo !== 0) {
      return porTipo;
    }

    const porNumero = numeroOrdenable(left.Numero) - numeroOrdenable(right.Numero);
    if (porNumero !== 0) {
      return porNumero;
    }

    const porPosicion = numeroOrdenable(left.Posicion) - numeroOrdenable(right.Posicion);
    return porPosicion !== 0 ? porPosicion : left.IdEspacio - right.IdEspacio;
  });
}

function numeroOrdenable(value: number): number {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
}
