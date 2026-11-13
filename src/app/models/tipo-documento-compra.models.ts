export interface TipoDocumentoCompraMantenimiento {
  IdTipoDocumentoCompra: string;
  Descripcion: string;
  Mascara: string | null;
  Naturaleza: number;
  Activo: boolean;
  PermiteRetenciones: boolean;
  EsPredefinido: boolean;
  Cambiando?: boolean;
}

export interface TipoDocumentoCompraCrear {
  Codigo: string;
  Descripcion: string;
}

export interface TipoDocumentoCompraEstado {
  Activo: boolean;
}
