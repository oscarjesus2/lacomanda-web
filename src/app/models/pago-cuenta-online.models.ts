export interface ConfiguracionPagoCuentaOnline {
  Activa: boolean;
  Proveedor: 'Monei' | 'Culqi' | string;
  PaisISO2: 'ES' | 'PE' | string;
  MoneiAccountId?: string;
  CulqiPublicKey?: string;
  CredencialPrivadaConfigurada: boolean;
  CorreoContactoPublico?: string;
  UrlTerminosCondiciones?: string;
  UrlCambiosDevoluciones?: string;
  UrlLibroReclamaciones?: string;
  RequisitosCulqiConfirmados: boolean;
  UrlWebhook: string;
  SecretoWebhookConfigurado: boolean;
}

export interface ActualizarConfiguracionPagoCuentaOnline {
  Activa: boolean;
  MoneiAccountId?: string;
  MoneiApiKey?: string;
  CulqiPublicKey?: string;
  CulqiSecretKey?: string;
  CulqiWebhookSecret?: string;
  CorreoContactoPublico?: string;
  UrlTerminosCondiciones?: string;
  UrlCambiosDevoluciones?: string;
  UrlLibroReclamaciones?: string;
  RequisitosCulqiConfirmados: boolean;
}
