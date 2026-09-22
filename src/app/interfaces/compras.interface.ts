import { ReporteContableImpuesto } from './reporte-contable-impuesto.interface';

/** Campos del informe de compras devueltos por /api/Compra/InformeContableCompra. */
export interface InformeContableCompra {
    IdTipoDocumento: string;
    FechaEmision: string;
    FechaRecepcion: string;
    EstadoDocumento: string;
  TipoDoc: string;
  TipoDocm: string;
  SerieDocm: string;
  NoDocm: string;
  RucCodigoCliente: string;
  RazonSocial: string;
  Afecto: number;
  Inafecto: number;
  Exonerado: number;
  Otros: number;
  PorcentajeIGV: number | null;
  IGV: number;
  ISC: number;
  Total: number;
  DiferenciaDesglose: number;
  DesgloseImpuestos: ReporteContableImpuesto[];
  TipoReferencia: string;
  SerieReferencia: string;
  NoReferencia: string;
  FechaReferencia: string;
  Moneda: string;
  Cambio: number;
  FechaDepositoDetraccion: string;
  NoDepositoDetraccion: string;
  Usuario: string;
  FechaPago: string;
  Referencia: string;
  Cuenta: string;
}
