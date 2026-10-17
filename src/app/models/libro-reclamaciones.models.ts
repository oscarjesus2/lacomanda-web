export interface LibroReclamacion {
  Codigo: string;
  Tipo: string;
  NombreConsumidor: string;
  TipoDocumento: string;
  NumeroDocumento: string;
  Correo: string;
  Telefono?: string | null;
  Direccion: string;
  BienContratado: string;
  MontoReclamado?: number | null;
  Detalle: string;
  PedidoConsumidor: string;
  RegistradaUtc: Date;
}
