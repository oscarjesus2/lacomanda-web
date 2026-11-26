import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { crearZip, leerFuentesCaja, verificarRuntime } from '../../scripts/empaquetar-caja-windows.mjs';

test('rechaza un ejecutable que no corresponde al Node x64 fijado', () => {
  assert.throws(() => verificarRuntime(Buffer.from('runtime distinto')), /SHA-256/);
});

test('el ZIP tiene el instalador en raíz, runtime privado y todos los módulos de caja', async t => {
  const carpeta = await mkdtemp(join(tmpdir(), 'verificar-zip-caja-'));
  t.after(() => rm(carpeta, { recursive: true, force: true }));
  const fuentes = await leerFuentesCaja();
  const entradas = [...fuentes, ['runtime/node.exe', Buffer.from('runtime privado de prueba')]];
  assert.ok(entradas.some(([nombre]) => nombre === 'src/main.mjs'));
  const archivo = join(carpeta, 'paquete.zip');
  await writeFile(archivo, await crearZip(entradas));
  const ejecutar = promisify(execFile);
  if (process.platform === 'win32') {
    await ejecutar('tar.exe', ['-xf', archivo], { cwd: carpeta, windowsHide: true });
  } else {
    await ejecutar('python3', ['-m', 'zipfile', '-e', archivo, carpeta]);
  }
  assert.deepEqual((await readdir(carpeta)).sort(), ['install.ps1', 'paquete.zip', 'runtime', 'src', 'windows']);
  for (const [nombre, bytes] of entradas) assert.deepEqual(await readFile(join(carpeta, nombre)), bytes);
});
