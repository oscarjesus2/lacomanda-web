export interface InformacionLegalPagoPublica {
  PaisISO2: string;
  NombreComercial: string;
  RazonSocial: string;
  NumeroIdentificacion: string;
  Direccion: string;
  Telefono: string;
  CorreoContacto?: string;
}

export interface RegistrarLibroReclamacionPublico {
  Tipo: 'queja' | 'reclamo';
  NombreConsumidor: string;
  TipoDocumento: string;
  NumeroDocumento: string;
  Correo: string;
  Telefono?: string;
  Direccion: string;
  BienContratado: string;
  MontoReclamado?: number;
  Detalle: string;
  PedidoConsumidor: string;
}

export interface LibroReclamacionRegistrado {
  Codigo: string;
  RegistradaUtc: Date;
}
