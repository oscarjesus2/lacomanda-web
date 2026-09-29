import {
  ProveedorCatalogo,
  ProveedorGuardar,
} from './proveedor.models';

export interface EgresoCajaCategoria {
  IdSubTipoMovimiento: number;
  Descripcion: string;
}

export interface EgresoCajaBeneficiario {
  IdProveedor: number;
  RazonSocial: string;
  NumeroIdentificacion: string;
}

export interface EgresoCajaArticulo {
  IdProducto: number;
  Descripcion: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  PrecioSugerido: number;
  EsServicio: boolean;
  Inventariable: boolean;
  Presentaciones: EgresoCajaPresentacion[];
}

export interface EgresoCajaPresentacion {
  IdPresentacionCompra: number | null;
  IdProveedor: number | null;
  IdUnidadCompra: number;
  UnidadCompra: string;
  FactorConversionStock: number;
  PrecioSugerido: number;
  EsUnidadBase: boolean;
}

export interface EgresoCajaSubArea {
  IdSubAreaAlmacen: number;
  Descripcion: string;
  AreaAlmacen: string;
}

export interface EgresoCajaCatalogo {
  Categorias: EgresoCajaCategoria[];
  Beneficiarios: EgresoCajaBeneficiario[];
  Articulos: EgresoCajaArticulo[];
  SubAreas: EgresoCajaSubArea[];
  Proveedor: ProveedorCatalogo;
}

export interface EgresoCajaDetalleCrear {
  IdProducto: number;
  Cantidad: number;
  Precio: number;
  IdPresentacionCompra: number | null;
  IdSubAreaAlmacen: number | null;
}

export interface EgresoCajaCrear {
  IdCaja: number;
  IdTurno: number;
  IdProveedor: number | null;
  NuevoProveedor: ProveedorGuardar | null;
  IdSubTipoMovimiento: number;
  Concepto: string;
  Referencia: string | null;
  Detalles: EgresoCajaDetalleCrear[];
}

export interface EgresoCajaRegistrado {
  IdEntrada: number;
  NumeroDocumento: string;
  Total: number;
  Documento: string;
  GeneroIngresoInventario: boolean;
}
