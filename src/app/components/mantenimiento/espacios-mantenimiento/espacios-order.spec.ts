import { Espacios } from 'src/app/models/espacios.models';
import { ordenarEspaciosPorTipoYNumero } from './espacios-order';

describe('ordenarEspaciosPorTipoYNumero', () => {
  it('ordena por tipo de espacio y después por número', () => {
    const entrada = [
      new Espacios({ IdEspacio: 1, Descripcion: 'LOUNGE', Numero: 1, Posicion: 1 }),
      new Espacios({ IdEspacio: 2, Descripcion: 'BOX', Numero: 10, Posicion: 10 }),
      new Espacios({ IdEspacio: 3, Descripcion: 'barra', Numero: 2, Posicion: 2 }),
      new Espacios({ IdEspacio: 4, Descripcion: 'BARRA', Numero: 1, Posicion: 1 }),
      new Espacios({ IdEspacio: 5, Descripcion: 'BOX', Numero: 2, Posicion: 2 }),
    ];

    const resultado = ordenarEspaciosPorTipoYNumero(entrada);

    expect(resultado.map(item => item.IdEspacio)).toEqual([4, 3, 5, 2, 1]);
    expect(entrada.map(item => item.IdEspacio)).toEqual([1, 2, 3, 4, 5]);
  });

  it('usa posición e identificador como desempate estable', () => {
    const resultado = ordenarEspaciosPorTipoYNumero([
      new Espacios({ IdEspacio: 8, Descripcion: 'BARRA', Numero: 1, Posicion: 3 }),
      new Espacios({ IdEspacio: 7, Descripcion: 'BARRA', Numero: 1, Posicion: 2 }),
      new Espacios({ IdEspacio: 6, Descripcion: 'BARRA', Numero: 1, Posicion: 2 }),
    ]);

    expect(resultado.map(item => item.IdEspacio)).toEqual([6, 7, 8]);
  });

  it('envía los números no válidos al final del mismo tipo', () => {
    const resultado = ordenarEspaciosPorTipoYNumero([
      new Espacios({ IdEspacio: 1, Descripcion: 'BOX', Numero: Number.NaN, Posicion: 1 }),
      new Espacios({ IdEspacio: 2, Descripcion: 'BOX', Numero: 2, Posicion: 2 }),
      new Espacios({ IdEspacio: 3, Descripcion: 'BOX', Numero: 1, Posicion: 3 }),
    ]);

    expect(resultado.map(item => item.IdEspacio)).toEqual([3, 2, 1]);
  });
});
