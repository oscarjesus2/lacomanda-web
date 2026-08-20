/**
 * Tipos de grupo que gestiona el mantenimiento de Almacén.
 * "P" queda fuera a propósito: esos son los grupos de venta y los mantiene
 * Ventas, con otra licencia.
 */
export type TipoGrupoAlmacen = 'I' | 'A';

export interface GrupoAlmacen {
  IdGrupo: number;
  Descripcion: string;
  Activo: boolean;
  TipoGrupo: TipoGrupoAlmacen;
}

export interface GrupoAlmacenGuardar {
  Descripcion: string;
  Activo: boolean;
  TipoGrupo: TipoGrupoAlmacen;
}

export const TIPOS_GRUPO_ALMACEN: ReadonlyArray<{
  valor: TipoGrupoAlmacen;
  etiqueta: string;
}> = [
  { valor: 'I', etiqueta: 'Insumo' },
  { valor: 'A', etiqueta: 'Artículo' },
];
