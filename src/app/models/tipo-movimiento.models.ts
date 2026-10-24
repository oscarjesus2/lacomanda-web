export interface TipoMovimientoMantenimiento {
  IdTipoMovimiento: number;
  Descripcion: string;
  SubTipos: SubTipoMovimientoMantenimiento[];
}

export interface SubTipoMovimientoMantenimiento {
  IdSubTipoMovimiento: number;
  Descripcion: string;
  Activo: boolean;
}

export interface TipoMovimientoGuardar {
  Descripcion: string;
}

export interface SubTipoMovimientoGuardar {
  Descripcion: string;
  Activo: boolean;
}
