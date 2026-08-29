import { TenantTextKey } from '../services/localization/tenant-texts.en';

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
  /** Clave del catálogo de textos, para respetar el idioma del usuario. */
  clave: TenantTextKey;
}> = [
  { valor: 'I', clave: 'groupTypeSupply' },
  { valor: 'A', clave: 'groupTypeItem' },
];
