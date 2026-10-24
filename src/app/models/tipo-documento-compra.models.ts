export interface TipoDocumentoCompraMantenimiento {
  IdTipoDocumentoCompra: string;
  Descripcion: string;
  Mascara: string | null;
  Naturaleza: number;
  Activo: boolean;
  PermiteRetenciones: boolean;
  Cambiando?: boolean;
}

export interface TipoDocumentoCompraEstado {
  Activo: boolean;
}
