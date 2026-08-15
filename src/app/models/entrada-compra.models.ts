import { ProveedorGuardar } from './proveedor.models';

export interface EntradaCompraResumen {
  IdEntrada: number;
  IdTipoDocumento: string;
  TipoDocumento: string;
  NumDocumento: string;
  FechaEmision: string;
  FechaRecepcion: string;
  IdProveedor: number;
  NumeroIdentificacionProveedor: string;
  Proveedor: string;
  TipoMovimiento: string;
  SubTipoMovimiento: string;
  IdMoneda: string;
  ValorCompra: number;
  TotalImpuestos: number;
  TotalCompra: number;
  Estado: number;
  EstadoDescripcion: string;
  EstadoPago: number;
  EstadoPagoDescripcion: string;
}

export interface EntradaCompra extends EntradaCompraResumen {
  IdTipoMovimiento: number;
  IdSubTipoMovimiento: number;
  TasaCambio: number;
  Observacion: string;
  PreciosIncluyenImpuestos: boolean;
  FechaPagoProgramada: string | null;
  Detalles: EntradaCompraDetalle[];
  Pagos: EntradaCompraPago[];
}

export interface EntradaCompraDetalle {
  IdProducto: number;
  Producto: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  Cantidad: number;
  PrecioUnitario: number;
  ValorCompra: number;
  TotalImpuestos: number;
  Subtotal: number;
  IdSubAreaAlmacen: number | null;
  SubAreaAlmacen: string;
  Impuestos: string[];
}

export interface EntradaCompraGuardar {
  IdTipoDocumento: string;
  NumDocumento: string;
  FechaEmision: Date | string;
  FechaRecepcion: Date | string;
  IdProveedor: number | null;
  IdTipoMovimiento: number | null;
  IdSubTipoMovimiento: number | null;
  IdMoneda: string;
  TasaCambio: number;
  Observacion: string;
  PreciosIncluyenImpuestos: boolean;
  Detalles: EntradaCompraLineaGuardar[];
}

export interface EntradaCompraLineaGuardar {
  IdProducto: number;
  Cantidad: number;
  Importe: number;
  IdSubAreaAlmacen: number | null;
  Impuestos: string[];
}

export interface EntradaCompraCatalogos {
  PaisISO2: string;
  IdMonedaPredeterminada: string;
  TiposDocumento: EntradaCompraTipoDocumento[];
  TiposMovimiento: EntradaCompraMovimiento[];
  Monedas: EntradaCompraOpcion[];
  Proveedores: EntradaCompraProveedor[];
  Articulos: EntradaCompraArticulo[];
  SubAreas: EntradaCompraSubArea[];
  Impuestos: EntradaCompraImpuesto[];
  FormasPago: EntradaCompraOpcionEntera[];
}

export interface EntradaCompraOpcionEntera {
  Id: number;
  Descripcion: string;
}

export interface EntradaCompraPago {
  IdPagoEntrada: number;
  FechaPago: string;
  IdTipoPago: number;
  FormaPago: string;
  IdMoneda: string;
  IdBancoOrigen: number | null;
  IdBancoDestino: number | null;
  MontoPagado: number;
  Referencia: string;
  Observacion: string;
}

export interface EntradaCompraPagoGuardar {
  FechaPago: Date | string;
  IdTipoPago: number | null;
  IdMoneda: string;
  IdBancoOrigen: number | null;
  IdBancoDestino: number | null;
  MontoPagado: number;
  Referencia: string;
  Observacion: string;
}

export interface EntradaCompraCanjearGuias {
  IdsGuias: number[];
  IdTipoDocumento: string;
  NumDocumento: string;
  FechaEmision: Date | string;
  FechaRecepcion: Date | string;
  IdMoneda: string;
  TasaCambio: number;
  Observacion: string;
}

export interface EntradaCompraCrearNota {
  IdEntradaOrigen: number;
  TipoNota: 1 | 2;
  TipoAjuste: 1 | 2;
  Documento: EntradaCompraGuardar;
}

export interface EntradaCompraOpcion {
  Id: string;
  Descripcion: string;
}

export interface EntradaCompraTipoDocumento
  extends EntradaCompraOpcion {
  Naturaleza: number;
  Mascara: string | null;
}

export interface EntradaCompraMovimiento {
  IdTipoMovimiento: number;
  Descripcion: string;
  SubTipos: EntradaCompraSubMovimiento[];
}

export interface EntradaCompraSubMovimiento {
  IdSubTipoMovimiento: number;
  Descripcion: string;
}

export interface EntradaCompraProveedor {
  IdProveedor: number;
  NumeroIdentificacion: string;
  RazonSocial: string;
  DiasCredito: number;
}

export interface EntradaCompraArticulo {
  IdProducto: number;
  Descripcion: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  PrecioCompra: number;
  Inventariable: boolean;
  Impuestos: string[];
}

export interface EntradaCompraSubArea {
  IdSubAreaAlmacen: number;
  Descripcion: string;
  AreaAlmacen: string;
}

export interface EntradaCompraImpuesto {
  IdImpuestoPais: string;
  Descripcion: string;
  Tasa: number;
  FijoPorUnidad: number;
}

export interface FacturaCompraIaPrevisualizacion {
  Cuota: CuotaDocumentosCompraIa | null;
  IdProveedor: number | null;
  NumeroIdentificacionProveedor: string;
  RazonSocialProveedor: string;
  IdTipoIdentidadProveedor: string | null;
  DireccionProveedor: string;
  TelefonoProveedor: string;
  ContactoProveedor: string;
  EmailProveedor: string;
  IdTipoDocumento: string | null;
  TipoDocumentoDetectado: string;
  NumeroDocumento: string;
  FechaEmision: string | null;
  IdMoneda: string | null;
  TasaCambio: number | null;
  PreciosIncluyenImpuestos: boolean;
  SubtotalDetectado: number | null;
  ImpuestosDetectados: number | null;
  TotalDetectado: number | null;
  Confianza: number;
  RequiereRevision: boolean;
  Advertencias: string[];
  Lineas: FacturaCompraIaLinea[];
}

export interface CuotaDocumentosCompraIa {
  LimiteBase: number;
  CreditosExtra: number;
  LimiteTotal: number;
  Utilizados: number;
  Restantes: number;
  PorcentajeUtilizado: number;
  PeriodoInicioUtc: string;
  PeriodoFinUtc: string;
  EsPrueba: boolean;
  MostrarAviso: boolean;
  Agotada: boolean;
}

export interface ConfirmarFacturaCompraIa {
  Entrada: EntradaCompraGuardar;
  NuevoProveedor: ProveedorGuardar | null;
}

export interface FacturaCompraIaLinea {
  CodigoOriginal: string;
  DescripcionOriginal: string;
  UnidadMedidaOriginal: string;
  CantidadOriginal: number;
  FactorConversionUnidad: number;
  IdProducto: number | null;
  Producto: string;
  UnidadMedida: string;
  Inventariable: boolean;
  Cantidad: number;
  Importe: number;
  IdSubAreaAlmacen: number | null;
  Impuestos: string[];
  Confianza: number;
  RequiereRevision: boolean;
  MotivoRevision: string;
}
