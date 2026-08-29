export interface Promocion {
  Correlativo: number;
  Titulo: string;
  AnuncioPrincipal: string;
  TerminosCondiciones: string;
  PrecioMinimoCompra: number;
  OfertaDesde: string | Date;
  OfertaHasta: string | Date;
  Imagen?: string | null;
  TieneImagen: boolean;
  Activo: boolean;
}

export interface PromocionGuardar {
  Titulo: string;
  AnuncioPrincipal: string;
  TerminosCondiciones: string;
  PrecioMinimoCompra: number;
  OfertaDesde: string | Date;
  OfertaHasta: string | Date;
  Activo: boolean;
}
