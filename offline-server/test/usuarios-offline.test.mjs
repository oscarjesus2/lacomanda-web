import test from 'node:test';
import assert from 'node:assert/strict';
import { ListarUsuariosOffline } from '../src/application/use-cases/listar-usuarios-offline.mjs';
import { SeleccionarUsuarioOffline } from '../src/application/use-cases/seleccionar-usuario-offline.mjs';

const usuarios = [
  { IdUsuario: 1, NombreUsuario: 'Ana', Activo: true, IdNivel: 2, IdEmpleado: 9,
    PuedeAplicarDescuento: true, Token: 'no-guardar-en-respuesta', Email: 'ana@example.test' },
  { IdUsuario: 2, NombreUsuario: 'Desactivado', Activo: false, IdNivel: 2 },
];

test('permite seleccionar un usuario activo y conserva sus permisos sin exponer tokens', async () => {
  const repo = { obtener: async () => ({ maestros: { usuarios } }) };
  const lista = await new ListarUsuariosOffline(repo).ejecutar();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].NombreUsuario, 'Ana');
  assert.equal(lista[0].PuedeAplicarDescuento, true);
  assert.equal('Token' in lista[0], false);
  assert.equal('Email' in lista[0], false);
  assert.deepEqual(await new SeleccionarUsuarioOffline(repo).ejecutar(1), lista[0]);
});

test('no permite seleccionar usuarios inactivos o inexistentes', async () => {
  const repo = { obtener: async () => ({ maestros: { usuarios } }) };
  const caso = new SeleccionarUsuarioOffline(repo);
  await assert.rejects(caso.ejecutar(2), /no está disponible/);
  await assert.rejects(caso.ejecutar(0), /no es válido/);
});

test('no muestra usuarios cuando la lista no fue preparada antes del corte', async () => {
  const caso = new ListarUsuariosOffline({ obtener: async () => ({ maestros: {} }) });
  await assert.rejects(caso.ejecutar(), /no están preparados/);
});

test('el acceso offline no concede cierre de turno aunque el usuario tenga permiso online', async () => {
  const repo = { obtener: async () => ({ maestros: { usuarios: [
    { ...usuarios[0], PuedeCerrarTurno: true },
  ] } }) };
  const seleccionado = await new SeleccionarUsuarioOffline(repo).ejecutar(1);
  assert.equal(seleccionado.PuedeCerrarTurno, false);
});
