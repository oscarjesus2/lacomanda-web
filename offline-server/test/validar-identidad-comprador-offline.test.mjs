import test from 'node:test';
import assert from 'node:assert/strict';
import { validarIdentidadComprador } from '../src/application/validators/validar-identidad-comprador-offline.mjs';

const cliente = { IdTipoIdentidad: 'NIF', NumeroIdentificacion: '12345678Z', RazonSocial: 'Cliente' };
const maestros = { contexto: { paisISO2: 'ES' }, tiposidentidad: [
  { Activo: true, IdTipoIdentidad: 'NIF', RequiereParaFactura: true, RegexValidacion: '^\\d{8}[A-Z]$' },
  { Activo: true, IdTipoIdentidad: 'PASS', RequiereParaFactura: false },
] };

test('valida la identificación de las facturas usando el catálogo del país', () => {
  const venta = { IdTipoDocumento: 1, Total: 70 };
  assert.throws(() => validarIdentidadComprador({ venta, cliente: null }, maestros), /identificación/);
  assert.throws(() => validarIdentidadComprador({ venta, cliente: { ...cliente, IdTipoIdentidad: 'PASS' } }, maestros), /tipo de identificación/);
  assert.throws(() => validarIdentidadComprador({ venta, cliente: { ...cliente, NumeroIdentificacion: '123' } }, maestros), /formato/);
  validarIdentidadComprador({ venta, cliente }, maestros);
});

test('comprueba los umbrales de identificación que aplica el backend en España y Perú', () => {
  validarIdentidadComprador({ venta: { IdTipoDocumento: 5, Total: 400 }, cliente: null }, maestros);
  assert.throws(() => validarIdentidadComprador({ venta: { IdTipoDocumento: 5, Total: 400.01 }, cliente: null }, maestros), /identificación/);
  const peru = { contexto: { paisISO2: 'PE' }, tiposidentidad: [{ IdTipoIdentidad: 'DNI', Activo: true }] };
  validarIdentidadComprador({ venta: { IdTipoDocumento: 2, Total: 700 }, cliente: null }, peru);
  assert.throws(() => validarIdentidadComprador({ venta: { IdTipoDocumento: 2, Total: 700.1 },
    cliente: { ...cliente, IdTipoIdentidad: 'DNI', NumeroIdentificacion: '123' } }, peru), /ocho dígitos/);
});
