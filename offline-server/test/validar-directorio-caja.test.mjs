import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { validarDirectorioCaja } from '../src/application/validators/validar-directorio-caja.mjs';

test('exige una ruta absoluta y rechaza rutas UNC compartidas', () => {
  assert.doesNotThrow(() => validarDirectorioCaja(resolve('datos-caja')));
  assert.throws(() => validarDirectorioCaja('datos-caja'), /ruta local absoluta/);
  assert.throws(() => validarDirectorioCaja('\\\\servidor\\pedidos'), /ruta local absoluta/);
  assert.throws(() => validarDirectorioCaja('//servidor/pedidos'), /ruta local absoluta/);
});
