// Refleja Application.Dto.EntradaProductoDto del backend (PascalCase).
// El JSON llega en PascalCase porque la API usa PropertyNamingPolicy = null.
export interface EntradaProducto {
  IdProducto: number;
  TipoEntrada: string;   // discriminador estable: NACIONAL, INTERNACIONAL, ...
  Nombre: string;
  Precio: number;
  IdMoneda: string;
  SimboloMoneda: string;
}
