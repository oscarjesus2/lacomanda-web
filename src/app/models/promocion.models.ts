export interface Promocion {
  Correlativo: number;
  Titulo: string;
  AnuncioPrincipal: string;
  TerminosCondiciones: string;
  PrecioMinimoCompra: number;
  OfertaDesde: string | Date;
  OfertaHasta: string | Date;
  Imagen?: string | null;
  Activo: boolean;
}

export type PromocionGuardar = Omit<Promocion, 'Correlativo'>;
