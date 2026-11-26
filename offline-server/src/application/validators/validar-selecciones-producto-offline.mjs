/** Reproduce los cupos de las secciones de menú y los factores de sus complementos. */
export function validarSeleccionesProducto(detalle, producto, productos) {
  const menu = detalle.PedidoMenu ?? [];
  const complementos = detalle.PedidoComplemento ?? [];
  if (!Array.isArray(menu) || !Array.isArray(complementos)) throw new TypeError('Las opciones del producto no son válidas.');
  const principal = producto.Tipo === 1 && producto.IdSeccionMenu === 0;
  if (!principal && menu.length) throw new Error('El producto no admite selecciones de menú.');
  if (producto.Tipo !== 2 && complementos.length) throw new Error('El producto no admite complementos.');
  if (principal) {
    if (!producto.SeccionesMenu?.length) throw new Error('El menú no tiene secciones configuradas.');
    const cantidades = new Map();
    for (const eleccion of menu) {
      const seccion = producto.SeccionesMenu.find(s => s.IdSeccionMenu === eleccion?.IdSeccionMenu);
      const opcion = productos.find(p => p.IdProducto === eleccion?.IdProductoSeccionMenu);
      if (eleccion?.Estado === 0 || !seccion?.Opciones.includes(opcion?.IdProducto) || !opcion.Activo || opcion.Tipo !== 1
          || opcion.IdSeccionMenu !== seccion.IdSeccionMenu || !Number.isSafeInteger(eleccion.Cantidad) || eleccion.Cantidad <= 0) {
        throw new Error('La selección no pertenece a una sección disponible del menú.');
      }
      cantidades.set(seccion.IdSeccionMenu, (cantidades.get(seccion.IdSeccionMenu) ?? 0) + eleccion.Cantidad);
    }
    for (const seccion of producto.SeccionesMenu) {
      const seleccionada = cantidades.get(seccion.IdSeccionMenu) ?? 0;
      const limite = seccion.Cantidad * detalle.Cantidad;
      if (seleccionada > limite || (!seccion.EsOpcional && seleccionada !== limite)) throw new Error('Revise las cantidades de las secciones del menú.');
    }
  }
  if (complementos.length) {
    let total = 0;
    for (const eleccion of complementos) {
      const opcion = productos.find(p => p.IdProducto === eleccion?.IdProdComple);
      if (!opcion?.Activo || opcion.Tipo !== 3 || eleccion.ProductoComplemento?.IdProducto !== opcion.IdProducto
          || eleccion.ProductoComplemento.FactorComplemento !== opcion.FactorComplemento || !(opcion.FactorComplemento > 0)
          || !Number.isSafeInteger(eleccion.Cantidad) || eleccion.Cantidad <= 0) throw new Error('El complemento seleccionado no es válido.');
      total += eleccion.Cantidad * opcion.FactorComplemento;
    }
    if (!Number.isFinite(producto.Qty) || total > (producto.Qty * detalle.Cantidad) + 0.000001) {
      throw new Error('Los complementos superan el límite del producto.');
    }
  }
}
