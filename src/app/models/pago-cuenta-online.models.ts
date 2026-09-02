export interface ConfiguracionPagoCuentaOnline {
  Activa: boolean;
  Proveedor: 'Monei' | 'Culqi' | string;
  PaisISO2: 'ES' | 'PE' | string;
  MoneiAccountId?: string;
  CulqiPublicKey?: string;
  CredencialPrivadaConfigurada: boolean;
  UrlWebhook: string;
}

export interface ActualizarConfiguracionPagoCuentaOnline {
  Activa: boolean;
  MoneiAccountId?: string;
  MoneiApiKey?: string;
  CulqiPublicKey?: string;
  CulqiSecretKey?: string;
}
