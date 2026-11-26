import test from 'node:test';
import assert from 'node:assert/strict';
import { validarDirectorioFisicoCaja } from '../src/infrastructure/archivos/validar-directorio-fisico-caja.mjs';

test('acepta un directorio nuevo cuyo ancestro y unidad son locales', async () => {
  const consultas = [];
  await validarDirectorioFisicoCaja('C:\\datos\\nuevos', {
    plataforma: 'win32',
    realpath: async ruta => {
      if (ruta.endsWith('nuevos')) throw Object.assign(new Error(), { code: 'ENOENT' });
      return ruta;
    },
    obtenerTipoUnidad: async unidad => { consultas.push(unidad); return 'Fixed'; },
  });
  assert.deepEqual(consultas, ['C:\\']);
});

test('rechaza una unidad mapeada y un enlace local a una carpeta de red', async () => {
  await assert.rejects(validarDirectorioFisicoCaja('Z:\\datos', {
    plataforma: 'win32', realpath: async ruta => ruta, obtenerTipoUnidad: async () => 'Network',
  }), /disco local fijo/);
  await assert.rejects(validarDirectorioFisicoCaja('C:\\datos', {
    plataforma: 'win32', realpath: async () => '\\\\servidor\\carpeta', obtenerTipoUnidad: async () => 'Fixed',
  }), /disco local fijo/);
});

test('rechaza si no se puede identificar el tipo de unidad', async () => {
  await assert.rejects(validarDirectorioFisicoCaja('C:\\datos', {
    plataforma: 'win32', realpath: async ruta => ruta,
    obtenerTipoUnidad: async () => { throw new Error('No disponible'); },
  }), /No se pudo comprobar/);
});

test('comprueba la unidad configurada y la unidad real de un enlace local', async () => {
  const unidades = [];
  await validarDirectorioFisicoCaja('C:\\datos', {
    plataforma: 'win32', realpath: async () => 'D:\\real',
    obtenerTipoUnidad: async unidad => { unidades.push(unidad); return 'Fixed'; },
  });
  assert.deepEqual(unidades, ['C:\\', 'D:\\']);
});
