import { TecladoTactilComponent, TeclaTactil, VistaTecladoTactil } from './teclado-tactil.component';

/** Busca una tecla por su rótulo (literal o clave de texto). */
function buscar(teclado: TecladoTactilComponent, etiqueta: string): TeclaTactil {
  const tecla = teclado.filas
    .reduce<TeclaTactil[]>((todas, fila) => todas.concat(fila), [])
    .find(item => item.etiqueta === etiqueta || item.clave === etiqueta);

  if (!tecla) throw new Error(`No hay tecla «${etiqueta}» en la vista actual.`);
  return tecla;
}

/** La tecla de borrar se muestra como icono, no tiene rótulo. */
function teclaBorrar(teclado: TecladoTactilComponent): TeclaTactil {
  const tecla = teclado.filas
    .reduce<TeclaTactil[]>((todas, fila) => todas.concat(fila), [])
    .find(item => item.accion === 'borrar');

  if (!tecla) throw new Error('No hay tecla de borrar en la vista actual.');
  return tecla;
}

function escribir(teclado: TecladoTactilComponent, texto: string): void {
  for (const caracter of texto) {
    teclado.pulsar(buscar(teclado, caracter));
  }
}

describe('TecladoTactilComponent', () => {
  let teclado: TecladoTactilComponent;
  let ultimoValor: string | null;

  beforeEach(() => {
    teclado = new TecladoTactilComponent();
    ultimoValor = null;
    teclado.valorChange.subscribe(valor => (ultimoValor = valor));
  });

  it('escribe lo que se pulsa y avisa del valor', () => {
    escribir(teclado, 'sal');

    expect(teclado.valor).toBe('sal');
    expect(ultimoValor).toBe('sal');
  });

  it('respeta el límite de caracteres', () => {
    teclado.maxLength = 3;

    escribir(teclado, 'salon');

    expect(teclado.valor).toBe('sal');
  });

  it('escribe en mayúsculas mientras Mayús está activo', () => {
    teclado.pulsar(buscar(teclado, 'keyboardShift'));
    escribir(teclado, 'AB');

    expect(teclado.valor).toBe('AB');
    expect(buscar(teclado, 'keyboardShift').activa).toBeTrue();
  });

  it('borra el último carácter y no falla con el campo vacío', () => {
    escribir(teclado, 'no');
    teclado.pulsar(teclaBorrar(teclado));

    expect(teclado.valor).toBe('n');

    teclado.pulsar(teclaBorrar(teclado));
    teclado.pulsar(teclaBorrar(teclado));

    expect(teclado.valor).toBe('');
  });

  it('en importes admite un solo separador decimal', () => {
    teclado.modo = 'numerico';

    escribir(teclado, '12.5');
    teclado.pulsar(buscar(teclado, '.'));
    escribir(teclado, '0');

    expect(teclado.valor).toBe('12.50');
  });

  it('en importes puede ocultar el separador decimal', () => {
    teclado.modo = 'numerico';
    teclado.decimales = false;

    expect(() => buscar(teclado, '.')).toThrow();
  });

  it('avisa una sola vez al cambiar de juego de teclas', () => {
    const vistas: VistaTecladoTactil[] = [];
    teclado.vistaChange.subscribe(vista => vistas.push(vista));

    teclado.pulsar(buscar(teclado, '#+='));
    teclado.pulsar(buscar(teclado, 'ABC'));
    teclado.pulsar(buscar(teclado, '#+='));

    expect(vistas).toEqual(['simbolos', 'letras', 'simbolos']);
  });

  it('desde los importes se pasa a letras y se vuelve', () => {
    teclado.modo = 'numerico';

    expect(teclado.esVistaNumerica).toBeTrue();

    teclado.pulsar(buscar(teclado, 'ABC'));
    escribir(teclado, 'ab');

    expect(teclado.esVistaNumerica).toBeFalse();
    expect(teclado.valor).toBe('ab');

    teclado.pulsar(buscar(teclado, '123'));

    expect(teclado.esVistaNumerica).toBeTrue();
  });

  it('limpiar vacía el campo y avisa', () => {
    escribir(teclado, 'algo');

    teclado.limpiar();

    expect(teclado.valor).toBe('');
    expect(ultimoValor).toBe('');
  });

  it('confirmar avisa a quien lo usa', () => {
    let confirmado = false;
    teclado.aceptar.subscribe(() => (confirmado = true));

    teclado.confirmar();

    expect(confirmado).toBeTrue();
  });
});
