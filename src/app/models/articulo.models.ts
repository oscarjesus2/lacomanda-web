export interface Articulo {
  IdProducto: number;
  Codigo: string;
  Descripcion: string;
  DescripcionCompra: string;
  InsumoProducto: 'A' | 'I' | 'P';
  IdUnidadStock: number | null;
  UnidadStock: string;
  IdUnidadReceta: number | null;
  UnidadReceta: string;
  FactorReceta: number;
  IdGrupoCompra: number | null;
  GrupoCompra: string;
  Stock: number;
  StockMinimo: number;
  StockMaximo: number;
  Precio: number;
  PrecioCompra: number;
  Porcionable: boolean;
  Porcionado: boolean;
  AutoPorcion: boolean;
  Produccion: boolean;
  Inventario: boolean;
  Activo: boolean;
  IdImpuestoPais: string;
  Impuesto: string;
  TasaImpuesto: number;
}

export class ArticuloGuardar {
  IdProducto = 0;
  Descripcion = '';
  DescripcionCompra = '';
  InsumoProducto: 'A' | 'I' | 'P' = 'A';
  IdUnidadStock: number | null = null;
  IdUnidadReceta: number | null = null;
  FactorReceta = 1;
  IdGrupoCompra: number | null = null;
  StockMinimo = 0;
  StockMaximo = 0;
  Precio = 0;
  Porcionable = false;
  Porcionado = false;
  AutoPorcion = false;
  Produccion = false;
  Inventario = false;
  Activo = true;
  IdImpuestoPais = '';

  constructor(init?: Partial<ArticuloGuardar>) {
    Object.assign(this, init);
  }
}

export interface UnidadMedida {
  IdUnidad: number;
  Descripcion: string;
  CodigoSunat: string;
}
