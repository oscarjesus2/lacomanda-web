export interface Proveedor {
  IdProveedor: number;
  IdTipoIdentidad: string;
  TipoIdentidad: string;
  EtiquetaIdentificacion: string;
  NumeroIdentificacion: string;
  RazonSocial: string;
  Direccion: string;
  IdDistrito: number;
  Telefono: string | null;
  Contacto: string | null;
  Email: string | null;
  IdGrupo: string | null;
  DiasCredito: number;
  Activo: boolean;
}

export interface ProveedorTipoIdentidad {
  IdTipoIdentidad: string;
  Descripcion: string;
  Abreviatura: string;
  Etiqueta: string;
  RegexValidacion: string | null;
  Mascara: string | null;
}

export interface ProveedorCatalogo {
  PaisISO2: string;
  TiposIdentidad: ProveedorTipoIdentidad[];
}

export class ProveedorGuardar {
  IdTipoIdentidad = '';
  NumeroIdentificacion = '';
  RazonSocial = '';
  Direccion = '';
  IdDistrito = 0;
  Telefono: string | null = null;
  Contacto: string | null = null;
  Email: string | null = null;
  IdGrupo: string | null = null;
  DiasCredito = 0;
  Activo = true;

  constructor(data?: Partial<ProveedorGuardar>) {
    Object.assign(this, data);
  }
}
