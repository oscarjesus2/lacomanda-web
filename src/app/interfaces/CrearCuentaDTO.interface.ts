export interface DividirCuentaDTO {
    IdPedido: number;       // Identificador del pedido
    NroCuentaOrigen: number;
    NroCuentaDestino: number;
    NombreCuentaDestino: string;         // Identificador de la mesa
    Items: string;   // Número del pedido
  }