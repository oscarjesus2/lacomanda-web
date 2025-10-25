export class CajaTipoDocumento {
  IdCaja: number;
  IdTipoDocumento: number;
  Descripcion: string;
  Serie: string;
  NumeroActual: number;
  CopiasImpresion: number;
  ItemsPorDocumento: number;
  PreguntarParaImprimir: boolean;
  Activo: boolean;
  Mascara: string;      // viene de TipoDocumentoPais
  }