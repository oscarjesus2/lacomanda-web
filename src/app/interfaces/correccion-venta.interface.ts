import { CajaTipoDocumento } from '../models/caja-tipo-documento.model';

export enum TipoCorreccionVenta {
  Pagos = 1,
  Cliente = 2,
  TipoDocumento = 3,
}

export interface ClienteCorreccionVenta {
  IdTipoIdentidad: string;
  NumeroIdentificacion: string;
  RazonSocial: string;
  Direccion?: string;
  Correo?: string;
}

export interface PagoCorreccionVenta {
  Estado: number;
  IdTurno: number;
  Autorizacion?: string;
  Vuelto: number;
  Propina: number;
  MontoVenta: number;
  MontoPagado: number;
  MontoRecibido?: number;
  TipoCambio?: number;
  IdTipoPago: number;
  IdVenta: number;
  IdPago: number;
  IdTarjeta?: number;
  IdMoneda: string;
  Observacion?: string;
}

export interface PreparacionCorreccionVenta {
  IdVenta: number;
  IdCaja: number;
  IdTurno: number;
  IdTipoDocumento: number;
  TipoDocumento: string;
  Serie: string;
  NumDocumento: number;
  FechaEmision: string;
  Total: number;
  Estado: number;
  EstadoFiscal: number;
  PaisISO2: string;
  EnvioElectronicoOnline: boolean;
  Cliente: ClienteCorreccionVenta;
  Pagos: PagoCorreccionVenta[];
  TiposDocumentoDestino: CajaTipoDocumento[];
}

export interface SolicitudCorreccionVenta {
  TipoCorreccion: TipoCorreccionVenta;
  Motivo: string;
  DocumentoOtorgado: boolean;
  Pagos?: PagoCorreccionVenta[];
  Cliente?: ClienteCorreccionVenta;
  IdTipoDocumentoDestino?: number;
  AccionFiscalEsperada?: number;
}

export interface PlanCorreccionVenta {
  TipoCorreccion: TipoCorreccionVenta;
  AccionFiscal: number;
  IdTipoDocumentoDestino: number;
  Titulo: string;
  Explicacion: string;
  RequiereEnvioFiscal: boolean;
  GeneraNuevoDocumento: boolean;
  GeneraDocumentoCorrector: boolean;
  CodigoMotivoFiscal?: string;
}

export interface ResultadoCorreccionVenta {
  IdCorreccionVenta: number;
  IdVentaOriginal: number;
  IdVentaReemplazo?: number;
  IdDocumentoCorrector?: number;
  AccionFiscal: number;
  Estado: number;
  Mensaje: string;
}

export interface SolicitudAnulacionDocumentoVenta {
  Motivo: string;
  AnularPedido: boolean;
  DocumentoOtorgado: boolean | null;
}

export interface ResultadoAnulacionDocumentoVenta {
  IdCorreccionVenta: number;
  IdVenta: number;
  Anulada: boolean;
  AccionFiscal: number;
  IdNotaCredito?: number;
  Mensaje: string;
  FechaLimiteBaja?: string;
}
