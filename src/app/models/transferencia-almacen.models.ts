export interface TransferenciaAlmacenResumen {
  IdTransferencia: number;
  IdSubAreaAlmacenOrigen: number;
  SubAreaAlmacenOrigen: string;
  AreaAlmacenOrigen: string;
  IdSubAreaAlmacenDestino: number;
  SubAreaAlmacenDestino: string;
  AreaAlmacenDestino: string;
  Fecha: string;
  Estado: number;
  EstadoDescripcion: string;
  CantidadArticulos: number;
  CantidadTotal: number;
}

export interface TransferenciaAlmacen extends TransferenciaAlmacenResumen {
  Detalles: TransferenciaAlmacenDetalle[];
}

export interface TransferenciaAlmacenDetalle {
  IdProducto: number;
  Producto: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  Cantidad: number;
}

export interface TransferenciaAlmacenGuardar {
  IdSubAreaAlmacenOrigen: number | null;
  IdSubAreaAlmacenDestino: number | null;
  Fecha: Date | string;
  Detalles: TransferenciaAlmacenDetalleGuardar[];
}

export interface TransferenciaAlmacenDetalleGuardar {
  IdProducto: number;
  Cantidad: number;
}

export interface TransferenciaAlmacenCatalogos {
  SubAreas: TransferenciaAlmacenSubArea[];
  Articulos: TransferenciaAlmacenArticulo[];
}

export interface TransferenciaAlmacenSubArea {
  Id: number;
  Descripcion: string;
  AreaAlmacen: string;
}

export interface TransferenciaAlmacenArticulo {
  IdSubAreaAlmacen: number;
  IdProducto: number;
  Descripcion: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  Stock: number;
}
