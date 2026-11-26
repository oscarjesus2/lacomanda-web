import { ProductoCaja } from './caja-offline-api.service';
import { configuracionMenuLocal } from './configuracion-menu-local';

describe('Carta local en el selector habitual de menú', () => {
  it('conserva las cantidades y muestra sólo opciones sincronizadas y activas', () => {
    const opcion = { Activo: true, Tipo: 1, IdSeccionMenu: 1, AreasImpresion: [1] };
    const productos = [
      { IdProducto: 10, SeccionesMenu: [{ IdSeccionMenu: 1, Descripcion: 'Bebida', Cantidad: 2, EsOpcional: false, Opciones: [2, 3, 4, 5, 6] }] },
      { ...opcion, IdProducto: 2, NombreCorto: 'Café' },
      { ...opcion, IdProducto: 4, NombreCorto: 'Zumo', Activo: false },
      { ...opcion, IdProducto: 5, IdSeccionMenu: 7 },
      { ...opcion, IdProducto: 6, Tipo: 3 },
    ] as ProductoCaja[];
    expect(configuracionMenuLocal(10, productos).Secciones).toEqual([{
      IdSeccionMenu: 1, Descripcion: 'Bebida', Cantidad: 2, EsOpcional: false,
      Productos: [{ IdProducto: 2, Nombre: 'Café', IdSeccionMenu: 1, Activo: true }],
    }]);
    expect(configuracionMenuLocal(20, productos).Secciones).toEqual([]);
  });

  it('ofrece los bocadillos y las bebidas del desayuno aunque no tengan área de impresión ni venta individual', () => {
    const opcion = { Activo: true, Tipo: 1, Visible: false, VentaIndividual: false, AreasImpresion: [] };
    const productos = [
      { IdProducto: 1, SeccionesMenu: [
        { IdSeccionMenu: 7, Descripcion: 'Bocadillo', Cantidad: 1, EsOpcional: false, Opciones: [4, 5] },
        { IdSeccionMenu: 6, Descripcion: 'Bebida', Cantidad: 1, EsOpcional: false, Opciones: [2] },
      ] },
      { ...opcion, IdProducto: 4, IdSeccionMenu: 7, NombreCorto: 'Sándwich de pollo' },
      { ...opcion, IdProducto: 5, IdSeccionMenu: 7, NombreCorto: 'Queque de vainilla' },
      { ...opcion, IdProducto: 2, IdSeccionMenu: 6, NombreCorto: 'Café con leche' },
    ] as ProductoCaja[];
    const [bocadillo, bebida] = configuracionMenuLocal(1, productos).Secciones;
    expect(bocadillo.Productos.map(op => op.Nombre)).toEqual(['Queque de vainilla', 'Sándwich de pollo']);
    expect(bebida.Productos.map(op => op.Nombre)).toEqual(['Café con leche']);
  });
});
