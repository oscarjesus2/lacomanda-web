export interface RecetaResumen {
  IdReceta: number | null;
  IdProducto: number;
  Producto: string;
  PrecioVenta: number;
  CostoMesa: number;
  CostoLlevar: number;
  CostoDelivery: number;
  TieneRecetaRegistrada: boolean;
}

export interface Receta extends RecetaResumen {
  Detalles: RecetaDetalle[];
}

export interface RecetaDetalle {
  IdArticulo: number;
  Articulo: string;
  IdUnidad: number;
  Unidad: string;
  TipoUnidad: 1 | 2;
  Factor: number;
  Precio: number;
  CantidadMesa: number;
  CantidadLlevar: number;
  CantidadDelivery: number;
  IdArea: number;
  Area: string;
}

export interface RecetaDetalleGuardar {
  IdArticulo: number | null;
  TipoUnidad: 1 | 2;
  CantidadMesa: number;
  CantidadLlevar: number;
  CantidadDelivery: number;
  IdArea: number | null;
}

export interface RecetaGuardar {
  IdProducto: number;
  Detalles: RecetaDetalleGuardar[];
}

export interface AreaAlmacen {
  IdArea: number;
  Descripcion: string;
  Activo: boolean;
}

export interface RecetaReporteFila {
  IdReceta: number;
  IdProducto: number;
  Producto: string;
  CostoMesa: number;
  CostoLlevar: number;
  CostoDelivery: number;
  IdArticulo: number;
  Articulo: string;
  IdUnidad: number;
  Unidad: string;
  TipoUnidad: number;
  Tipo: string;
  Factor: number;
  CantidadMesa: number;
  CantidadLlevar: number;
  CantidadDelivery: number;
  Precio: number;
  IdArea: number;
  Area: string;
}
