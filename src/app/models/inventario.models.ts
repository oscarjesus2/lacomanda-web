export interface InventarioResumen {
  IdInventario: number;
  Tipo: 'T' | 'P';
  TipoDescripcion: string;
  Estado: number;
  EstadoDescripcion: string;
  FechaInventario: string;
  FechaRegistro: string;
  FechaCierre: string | null;
  UsuarioRegistro: number;
  TotalSubAreas: number;
  SubAreasContadas: number;
}

export interface Inventario extends InventarioResumen {
  SubAreas: InventarioSubArea[];
}

export interface InventarioSubArea {
  IdSubAreaAlmacen: number;
  SubArea: string;
  IdAreaAlmacen: number;
  Area: string;
  ConteoGuardado: boolean;
  FechaConteo: string | null;
  Detalles: InventarioDetalle[];
}

export interface InventarioDetalle {
  IdProducto: number;
  Codigo: string;
  Producto: string;
  IdUnidadMedida: number;
  Unidad: string;
  StockInicio: number;
  Ingresos: number;
  Salidas: number;
  StockSistema: number;
  StockContado: number | null;
  Ajuste: number | null;
}

export interface InventarioCrear {
  Tipo: 'T' | 'P';
  FechaInventario: Date;
  IdSubAreaAlmacen: number | null;
}

export interface InventarioConteoGuardar {
  Detalles: InventarioConteoLinea[];
}

export interface InventarioConteoLinea {
  IdProducto: number;
  IdUnidadMedida: number;
  StockContado: number | null;
}

export interface SubAreaAlmacenInventario {
  IdSubAreaAlmacen: number;
  Descripcion: string;
  IdAreaAlmacen: number;
  Area: string;
  Cuadrable: boolean;
}
