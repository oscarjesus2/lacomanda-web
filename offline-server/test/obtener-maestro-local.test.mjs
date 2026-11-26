import test from 'node:test';
import assert from 'node:assert/strict';
import { ObtenerMaestroLocal } from '../src/application/use-cases/obtener-maestro-local.mjs';

test('obtiene la ocupación local de mesas cuando existen cambios durante el corte', async () => {
  const repositorio = { obtener: async () => ({
    version: 7,
    maestros: { productos: [{ IdProducto: 1 }], mesas: [{ IdEspacio: 5, Ocupado: 0 }] },
  }) };
  const diario = { obtener: async (tipo, id) => {
    assert.equal(tipo, 'estado-local');
    assert.equal(id, 'mesas');
    return { datos: [{ IdEspacio: 5, Ocupado: 1 }] };
  } };
  const caso = new ObtenerMaestroLocal(repositorio, diario);
  assert.deepEqual(await caso.ejecutar('mesas'), { version: 7, datos: [{ IdEspacio: 5, Ocupado: 1 }] });
  assert.deepEqual(await caso.ejecutar('productos'), { version: 7, datos: [{ IdProducto: 1 }] });
});

test('mantiene la última copia de mesas si aún no hay cambios locales', async () => {
  const repositorio = { obtener: async () => ({ version: 7, maestros: { mesas: [{ IdEspacio: 5 }] } }) };
  const caso = new ObtenerMaestroLocal(repositorio, { obtener: async () => null });
  assert.deepEqual(await caso.ejecutar('mesas'), { version: 7, datos: [{ IdEspacio: 5 }] });
});
