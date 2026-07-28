export interface ProductoComboProducto {
  IdProducto: number;
  Nombre: string;
  IdSeccionMenu: number;
  Activo: boolean;
}

export interface ProductoComboSeccionCatalogo {
  IdSeccionMenu: number;
  Descripcion: string;
  Orden: number;
  Productos: ProductoComboProducto[];
}

export interface ProductoComboCatalogo {
  Combos: ProductoComboProducto[];
  Secciones: ProductoComboSeccionCatalogo[];
}

export interface ProductoComboSeccion {
  IdSeccionMenu: number;
  Descripcion: string;
  Cantidad: number;
  Productos: ProductoComboProducto[];
}

export interface ProductoComboConfiguracion {
  IdProducto: number;
  Secciones: ProductoComboSeccion[];
}

export interface GuardarProductoComboSeccion {
  Cantidad: number;
  IdProductos: number[];
}
