export interface CartaIaProducto {
  IdGrupoVenta: number | null;
  GrupoVenta: string;
  IdFamilia: number | null;
  Familia: string;
  IdSubFamilia: number | null;
  SubFamilia: string;
  IdProductoExistente: number | null;
  NombreCorto: string;
  Descripcion: string;
  DescripcionCarta: string;
  Precio: number | null;
  Confianza: number;
  Seleccionado: boolean;
  RequiereRevision: boolean;
  MotivoRevision: string;
}

export interface CartaIaPrevisualizacion {
  IdOperacion: string;
  IdMoneda: string;
  Confianza: number;
  RequiereRevision: boolean;
  Advertencias: string[];
  Productos: CartaIaProducto[];
}

export interface ImportacionCartaIaResultado {
  ProductosCreados: number;
  GruposCreados: number;
  FamiliasCreadas: number;
  SubFamiliasCreadas: number;
  DuplicadosOmitidos: number;
}

export interface ConfirmarImportacionCartaIa {
  IdOperacion: string;
  Productos: CartaIaProducto[];
}
