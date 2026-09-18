import { TecladoTactilComponent, TeclaTactil } from './teclado-tactil.component';

/** Campo de texto mínimo: el teclado escribe sobre el elemento real. */
function crearCampo(valor = '', maxLength = -1): HTMLInputElement {
  const campo = {
    value: valor,
    maxLength,
    selectionStart: valor.length,
    selectionEnd: valor.length,
    eventos: [] as string[],
    setSelectionRange(inicio: number, fin: number): void {
      campo.selectionStart = inicio;
      campo.selectionEnd = fin;
    },
    dispatchEvent(evento: Event): boolean {
      campo.eventos.push(evento.type);
      return true;
    },
    focus(): void { /* el foco no se mueve en las pruebas */ },
  };

  return campo as unknown as HTMLInputElement;
}

function buscar(teclado: TecladoTactilComponent, etiqueta: string): TeclaTactil {
  const tecla = teclado.filas
    .reduce<TeclaTactil[]>((todas, fila) => todas.concat(fila), [])
    .find(item => item.etiqueta === etiqueta || item.clave === etiqueta);

  if (!tecla) throw new Error(`No hay tecla «${etiqueta}» en la vista actual.`);
  return tecla;
}

function teclear(teclado: TecladoTactilComponent, texto: string): void {
  for (const caracter of texto) {
    teclado.pulsar(buscar(teclado, caracter));
  }
}

describe('TecladoTactilComponent', () => {
  let teclado: TecladoTactilComponent;
  let campo: HTMLInputElement;

  beforeEach(() => {
    teclado = new TecladoTactilComponent();
    campo = crearCampo();
    teclado.destino = campo;
  });

  it('escribe sobre el campo y avisa del cambio', () => {
    teclear(teclado, 'sal');

    expect(campo.value).toBe('sal');
    expect((campo as unknown as { eventos: string[] }).eventos).toContain('input');
  });

  it('escribe donde está el cursor, no siempre al final', () => {
    campo = crearCampo('sl');
    campo.setSelectionRange(1, 1);
    teclado.destino = campo;

    teclear(teclado, 'a');

    expect(campo.value).toBe('sal');
    expect(campo.selectionStart).toBe(2);
  });

  it('respeta el límite de caracteres del campo', () => {
    campo = crearCampo('', 3);
    teclado.destino = campo;

    teclear(teclado, 'salon');

    expect(campo.value).toBe('sal');
  });

  it('escribe en mayúsculas mientras Mayús está activo', () => {
    teclado.pulsar(buscar(teclado, 'keyboardShift'));
    teclear(teclado, 'AB');

    expect(campo.value).toBe('AB');
    expect(buscar(teclado, 'keyboardShift').activa).toBeTrue();
  });

  it('borra el carácter anterior al cursor y aguanta el campo vacío', () => {
    teclear(teclado, 'no');

    teclado.pulsar(buscar(teclado, 'keyboardBackspace'));
    expect(campo.value).toBe('n');

    teclado.pulsar(buscar(teclado, 'keyboardBackspace'));
    teclado.pulsar(buscar(teclado, 'keyboardBackspace'));
    expect(campo.value).toBe('');
  });

  it('cambia entre letras y símbolos', () => {
    teclado.pulsar(buscar(teclado, '#+='));
    teclear(teclado, '¿');

    expect(campo.value).toBe('¿');

    teclado.pulsar(buscar(teclado, 'ABC'));
    teclear(teclado, 'a');

    expect(campo.value).toBe('¿a');
  });

  it('limpiar vacía el campo', () => {
    teclear(teclado, 'algo');

    teclado.limpiar();

    expect(campo.value).toBe('');
  });

  it('sin campo destino no revienta', () => {
    teclado.destino = null;

    expect(() => teclear(teclado, 'a')).not.toThrow();
    expect(() => teclado.limpiar()).not.toThrow();
  });

  it('la tecla no roba el foco al campo', () => {
    let evitado = false;
    teclado.sostenerFoco({ preventDefault: () => (evitado = true) } as unknown as Event);

    expect(evitado).toBeTrue();
  });
});
