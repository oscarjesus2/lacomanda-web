export interface SunatConfiguration {
  PaisISO2: string;
  Ruc: string;
  Ubigeo: string;
  UsuarioSol: string;
  ClaveSolConfigurada: boolean;
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
}

export interface SaveSunatConfiguration {
  Ubigeo: string;
  UsuarioSol: string;
  ClaveSol: string;
  ClaveCertificado: string;
  Certificado: File;
}
