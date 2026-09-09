import { CartaIaPrevisualizacion, CartaIaProducto } from 'src/app/models/importacion-carta-ia.models';
import { integrarPrevisualizacionCarta } from './importacion-carta-preview.utils';

describe('integrarPrevisualizacionCarta', () => {
  it('conserva la primera operación y los cambios ya realizados al agregar otra lectura', () => {
    const productoEditado = producto('CEVICHE', 0.8);
    productoEditado.Precio = 18;
    const actual = previsualizacion('operacion-inicial', 0.8, [productoEditado], ['Revisar precios']);
    const nueva = previsualizacion('otra-operacion', 1, [producto('LOMO SALTADO', 1)], ['Otra advertencia']);

    const resultado = integrarPrevisualizacionCarta(actual, nueva);

    expect(resultado.Previsualizacion.IdOperacion).toBe('operacion-inicial');
    expect(resultado.Previsualizacion.Productos).toEqual([
      productoEditado,
      nueva.Productos[0],
    ]);
    expect(resultado.Previsualizacion.Productos[0].Precio).toBe(18);
    expect(resultado.Previsualizacion.Advertencias).toEqual([
      'Revisar precios',
      'Otra advertencia',
    ]);
    expect(resultado.ProductosAgregados).toBe(1);
  });

  it('omite productos repetidos entre fotos sin distinguir mayúsculas ni tildes', () => {
    const actual = previsualizacion('operacion', 0.9, [producto('Café helado', 0.9)]);
    const nueva = previsualizacion('otra', 0.9, [
      producto('CAFE HELADO', 0.8),
      producto('Té verde', 0.8),
      producto('TE VERDE', 0.7),
    ]);

    const resultado = integrarPrevisualizacionCarta(actual, nueva);

    expect(resultado.Previsualizacion.Productos.map(x => x.NombreCorto)).toEqual([
      'Café helado',
      'Té verde',
    ]);
    expect(resultado.ProductosAgregados).toBe(1);
    expect(resultado.DuplicadosOmitidos).toBe(2);
  });

  it('elimina duplicados de la primera tanda y conserva advertencias únicas', () => {
    const nueva = previsualizacion('operacion', 0.75, [
      producto('Pizza', 0.8),
      producto('PIZZA', 0.7),
    ], ['Revisar', 'Revisar']);

    const resultado = integrarPrevisualizacionCarta(null, nueva);

    expect(resultado.Previsualizacion.Productos.length).toBe(1);
    expect(resultado.Previsualizacion.Advertencias).toEqual(['Revisar']);
    expect(resultado.DuplicadosOmitidos).toBe(1);
  });
});

function previsualizacion(
  idOperacion: string,
  confianza: number,
  productos: CartaIaProducto[],
  advertencias: string[] = [],
): CartaIaPrevisualizacion {
  return {
    IdOperacion: idOperacion,
    IdMoneda: 'EUR',
    Confianza: confianza,
    RequiereRevision: false,
    Advertencias: advertencias,
    Productos: productos,
  };
}

function producto(nombre: string, confianza: number): CartaIaProducto {
  return {
    IdColor: 1,
    AreasImpresionIds: [1],
    IdGrupoVenta: null,
    GrupoVenta: 'COMIDA',
    IdFamilia: null,
    Familia: 'CARTA',
    IdSubFamilia: null,
    SubFamilia: 'PLATOS',
    IdProductoExistente: null,
    NombreCorto: nombre,
    NombreCompleto: nombre,
    DescripcionCarta: '',
    Precio: 10,
    Confianza: confianza,
    Seleccionado: true,
    RequiereRevision: false,
    MotivoRevision: '',
  };
}
