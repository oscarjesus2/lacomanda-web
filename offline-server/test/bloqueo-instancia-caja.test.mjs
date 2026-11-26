import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { adquirirBloqueoInstanciaCaja } from '../src/infrastructure/archivos/bloqueo-instancia-caja.mjs';

test('impide dos instancias sobre la misma carpeta y libera el bloqueo al cerrar', async () => {
  const raiz = resolve(tmpdir());
  const directorio = await mkdtemp(join(raiz, 'lacomanda-bloqueo-'));
  let primero;
  let siguiente;
  try {
    primero = await adquirirBloqueoInstanciaCaja(directorio);
    await assert.rejects(adquirirBloqueoInstanciaCaja(directorio), /ya hay una instancia/);
    await primero.cerrar();
    primero = null;
    siguiente = await adquirirBloqueoInstanciaCaja(directorio);
  } finally {
    if (primero) await primero.cerrar();
    if (siguiente) await siguiente.cerrar();
    if (!resolve(directorio).startsWith(raiz + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
});

test('el sistema libera el bloqueo si el proceso termina inesperadamente', { timeout: 10_000 }, async () => {
  const raiz = resolve(tmpdir());
  const directorio = await mkdtemp(join(raiz, 'lacomanda-bloqueo-'));
  const modulo = new URL('../src/infrastructure/archivos/bloqueo-instancia-caja.mjs', import.meta.url).href;
  const script = `import { adquirirBloqueoInstanciaCaja } from ${JSON.stringify(modulo)};
    await adquirirBloqueoInstanciaCaja(process.argv[1]); console.log('listo');`;
  let hijo;
  let bloqueo;
  try {
    hijo = spawn(process.execPath, ['--input-type=module', '-e', script, directorio], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let errores = '';
    hijo.stderr.on('data', datos => { errores += datos.toString(); });
    const resultado = await Promise.race([
      once(hijo.stdout, 'data').then(([datos]) => datos.toString()),
      once(hijo, 'exit').then(([codigo]) => { throw new Error(`El proceso terminó (${codigo}): ${errores}`); }),
    ]);
    assert.match(resultado, /listo/);
    await assert.rejects(adquirirBloqueoInstanciaCaja(directorio), /ya hay una instancia/);
    const termino = once(hijo, 'exit');
    hijo.kill();
    await termino;
    hijo = null;
    bloqueo = await adquirirBloqueoInstanciaCaja(directorio);
  } finally {
    if (hijo) hijo.kill();
    if (bloqueo) await bloqueo.cerrar();
    if (!resolve(directorio).startsWith(raiz + sep)) throw new Error('Ruta temporal no válida.');
    await rm(directorio, { recursive: true, force: true });
  }
});
