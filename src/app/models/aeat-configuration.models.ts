export enum ModoFiscalEspana {
  VeriFactu = 1,
  NoVeriFactu = 2,
}

export interface AeatConfiguration {
  PaisISO2: string;
  Nif: string;
  RazonSocialFiscal: string;
  ModoFiscal: ModoFiscalEspana | null;
  ModoFiscalDescripcion: string;
  NumeroInstalacion: string;
  CertificadoConfigurado: boolean;
  CertificadoVigente: boolean;
  NombreCertificado: string;
  CertificadoHuellaSha256: string;
  CertificadoSujeto: string;
  CertificadoEmisor: string;
  CertificadoSerie: string;
  CertificadoValidoDesdeUtc: string | null;
  CertificadoValidoHastaUtc: string | null;
  FechaConfiguracionUtc: string | null;
  FechaInicioVeriFactuUtc: string | null;
  PuedeCambiarANoVeriFactu: boolean;
  ProductorRazonSocial: string;
  ProductorNif: string;
  ProductoNombre: string;
  ProductoCodigo: string;
  ProductoVersion: string;
  DeclaracionResponsableUrl: string;
}

export interface SaveAeatConfiguration {
  Nif: string;
  ModoFiscal: ModoFiscalEspana;
  NumeroInstalacion: string;
  ClaveCertificado: string;
  Certificado: File;
}

export interface SendAeatRequirement {
  Desde: string;
  Hasta: string;
  ReferenciaRequerimiento: string;
}

export interface AeatIntegrityResult {
  RegistrosFacturacionVerificados: number;
  RegistrosEventoVerificados: number;
  VerificadoUtc: string;
}
