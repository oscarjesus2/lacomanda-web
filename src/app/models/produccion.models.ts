export interface RecetaProduccionResumen {
  IdRecetaProduccion: number;
  IdProductoProducido: number;
  ProductoProducido: string;
  UnidadProducida: string;
  Costo: number;
  Estado: number;
  CantidadInsumos: number;
}

export interface RecetaProduccion extends RecetaProduccionResumen {
  Detalles: RecetaProduccionDetalle[];
}

export interface RecetaProduccionDetalle {
  IdProductoInsumo: number;
  ProductoInsumo: string;
  TipoUnidad: number;
  IdUnidadMedida: number;
  UnidadMedida: string;
  Cantidad: number;
  Precio: number;
  Costo: number;
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
}

export interface RecetaProduccionGuardar {
  IdProductoProducido: number;
  Detalles: Array<{
    IdProductoInsumo: number;
    TipoUnidad: number;
    Cantidad: number;
    IdSubAreaAlmacen: number;
  }>;
}

export interface ProduccionResumen {
  IdProduccion: number;
  Fecha: string;
  IdUsuarioResponsable: number;
  UsuarioResponsable: string;
  Estado: number;
  EstadoDescripcion: string;
  CantidadLineas: number;
}

export interface Produccion extends ProduccionResumen {
  Detalles: ProduccionDetalle[];
}

export interface ProduccionDetalle {
  IdRecetaProduccion: number;
  IdProductoProducido: number;
  ProductoProducido: string;
  UnidadMedida: string;
  Cantidad: number;
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
  CostoUnitario: number;
}

export interface ProduccionGuardar {
  Fecha: Date | string;
  IdUsuarioResponsable: number;
  Detalles: Array<{
    IdRecetaProduccion: number;
    Cantidad: number;
    IdSubAreaAlmacen: number;
  }>;
}

export interface ProduccionCatalogos {
  SubAreas: Array<{ Id: number; Descripcion: string }>;
  Productos: ProduccionProducto[];
  Recetas: RecetaProduccionResumen[];
  Usuarios: Array<{ Id: number; Descripcion: string }>;
}

export interface ProduccionProducto {
  IdProducto: number;
  Descripcion: string;
  IdUnidadStock?: number;
  UnidadStock: string;
  IdUnidadReceta?: number;
  UnidadReceta: string;
  FactorReceta: number;
  PrecioCompra: number;
  Produccion: boolean;
}
