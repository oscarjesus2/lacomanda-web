export interface AnulacionDashboard {
  FechaOperacion: string;
  FechaAnulacion?: string | null;
  Origen: string;
  Documento: string;
  Producto: string;
  Cantidad: number;
  PrecioUnitario: number;
  Importe: number;
  Motivo?: string | null;
  Autoriza?: string | null;
}
