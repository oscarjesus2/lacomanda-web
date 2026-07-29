export interface AreaAlmacenMaestro {
  IdArea: number;
  Descripcion: string;
  Activo: boolean;
}

export class AreaAlmacenGuardar {
  Descripcion = '';
  Activo = true;

  constructor(data?: Partial<AreaAlmacenGuardar>) {
    Object.assign(this, data);
  }
}

export interface SubAreaAlmacen {
  IdSubAreaAlmacen: number;
  Descripcion: string;
  IdAreaAlmacen: number;
  Area: string;
  Cuadrable: boolean;
  Activo: boolean;
}

export class SubAreaAlmacenGuardar {
  Descripcion = '';
  IdAreaAlmacen: number | null = null;
  Cuadrable = true;
  Activo = true;

  constructor(data?: Partial<SubAreaAlmacenGuardar>) {
    Object.assign(this, data);
  }
}
