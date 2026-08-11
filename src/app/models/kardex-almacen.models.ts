export interface KardexSubAreaCatalogo {
  IdSubAreaAlmacen: number;
  IdAreaAlmacen: number;
  Descripcion: string;
}

export interface KardexProductoCatalogo {
  IdProducto: number;
  Descripcion: string;
  IdUnidadMedida?: number | null;
  UnidadMedida: string;
}

export interface KardexAlmacenCatalogos {
  SubAreas: KardexSubAreaCatalogo[];
  Articulos: KardexProductoCatalogo[];
}

export interface KardexAlmacenMovimiento {
  Fecha: string;
  Tipo: string;
  Operacion: string;
  Referencia: string;
  Entrada: number;
  Salida: number;
  ConteoInventario?: number | null;
  Saldo: number;
  Precio?: number | null;
  Observacion?: string | null;
}

export interface ConsultaKardexAlmacen {
  IdSubAreaAlmacen: number;
  SubAreaAlmacen: string;
  IdArticulo: number;
  Articulo: string;
  IdUnidadMedida?: number | null;
  UnidadMedida: string;
  FechaDesde: string;
  FechaHasta: string;
  SaldoInicial: number;
  TotalEntradas: number;
  TotalSalidas: number;
  SaldoFinal: number;
  Movimientos: KardexAlmacenMovimiento[];
}
