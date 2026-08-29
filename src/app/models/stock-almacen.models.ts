export interface AreaAlmacenStock {
  IdAreaAlmacen: number;
  Descripcion: string;
}

export interface SubAreaAlmacenStock {
  IdSubAreaAlmacen: number;
  IdAreaAlmacen: number;
  Descripcion: string;
}

export interface StockAlmacenItem {
  IdAreaAlmacen: number;
  Area: string;
  IdSubAreaAlmacen: number;
  SubArea: string;
  IdProducto: number;
  Producto: string;
  IdUnidadStock: number;
  UnidadStock: string;
  StockMinimo: number;
  StockMaximo: number;
  IdUltimoInventario: number | null;
  FechaUltimoInventario: string | null;
  TipoUltimoInventario: string;
  StockUltimoInventario: number | null;
  EntradasDesdeInventario: number;
  SalidasDesdeInventario: number;
  StockActual: number;
  IdUnidadReceta: number | null;
  UnidadReceta: string | null;
  FactorReceta: number | null;
  StockEnUnidadReceta: number | null;
  BajoMinimo: boolean;
  FechaUltimaActualizacion: string;
}

export interface ConsultaStockAlmacen {
  Areas: AreaAlmacenStock[];
  SubAreas: SubAreaAlmacenStock[];
  Items: StockAlmacenItem[];
  CantidadRegistros: number;
  CantidadBajoMinimo: number;
  StockTotalSeleccionado: number;
}
