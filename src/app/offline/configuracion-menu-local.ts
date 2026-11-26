import type { ProductoComboConfiguracion } from '../models/producto-combo.models';
import type { ProductoCaja } from './caja-offline-api.service';

export function configuracionMenuLocal(idProducto: number, productos: ProductoCaja[]): ProductoComboConfiguracion {
  const porId = new Map(productos.map(producto => [producto.IdProducto, producto]));
  const secciones = porId.get(idProducto)?.SeccionesMenu ?? [];
  return {
    IdProducto: idProducto,
    Secciones: secciones.map(({ Opciones, ...seccion }) => ({
      ...seccion,
      Productos: Opciones.flatMap(id => {
        const opcion = porId.get(id);
        return opcion?.Activo && opcion.Tipo === 1 && opcion.IdSeccionMenu === seccion.IdSeccionMenu ? [{
          IdProducto: id, Nombre: opcion.NombreCorto || opcion.NombreCompleto || `Producto ${id}`,
          IdSeccionMenu: seccion.IdSeccionMenu, Activo: true,
        }] : [];
      }).sort((a, b) => a.Nombre.localeCompare(b.Nombre)),
    })),
  };
}
