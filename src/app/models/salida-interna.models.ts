export interface SalidaInternaResumen {
  IdSalida: number;
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
  AreaAlmacen: string;
  IdMotivo: number;
  Motivo: string;
  Fecha: string;
  Observacion: string;
  Estado: number;
  EstadoDescripcion: string;
  CantidadArticulos: number;
}

export interface SalidaInterna extends SalidaInternaResumen {
  Detalles: SalidaInternaDetalle[];
}

export interface SalidaInternaDetalle {
  IdProducto: number;
  Producto: string;
  IdUnidadSeleccionada: number;
  UnidadSeleccionada: string;
  IdUnidadStock: number;
  UnidadStock: string;
  Cantidad: number;
  CantidadEnStock: number;
  Factor: number;
  TipoUnidad: number;
}

export interface SalidaInternaGuardar {
  IdSubAreaAlmacen: number | null;
  IdMotivo: number | null;
  Fecha: Date | string;
  Observacion: string;
  Detalles: SalidaInternaDetalleGuardar[];
}

export interface SalidaInternaDetalleGuardar {
  IdProducto: number;
  IdUnidadMedida: number;
  Cantidad: number;
}

export interface SalidaInternaCatalogos {
  Motivos: SalidaInternaOpcion[];
  SubAreas: SalidaInternaSubArea[];
  Articulos: SalidaInternaArticulo[];
}

export interface SalidaInternaOpcion {
  Id: number;
  Descripcion: string;
}

export interface SalidaInternaSubArea extends SalidaInternaOpcion {
  AreaAlmacen: string;
}

export interface SalidaInternaArticulo {
  IdProducto: number;
  Descripcion: string;
  IdUnidadStock: number;
  UnidadStock: string;
  IdUnidadReceta: number | null;
  UnidadReceta: string;
  FactorReceta: number;
  IdsSubAreaAlmacen: number[];
}
