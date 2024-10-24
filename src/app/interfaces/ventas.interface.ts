export interface VentasInterface {
    IdVenta: number;
    IdCaja: string;
    Caja: string;
    TipoDocumento: string;
    Documento: string;
    Cliente: string;
    FechaVenta: string; // Suponiendo que la fecha viene en formato de cadena
    Moneda: string;
    Dscto: number;
    Inafecto: number;
    ValorVenta: number;
    IGV: number;
    Servicio: number;
    ICBPER: number;
    Total: number;
    IdTurno: number;
    EstadoDescripcion: string;
    NombreArchivo: string;
    EstadoPago: string;
    IdTipopedido: string;
}

export interface VentaTragoGratisDTO {
    IdVenta: number;                 // Id de la venta
    IdTipoDocumento: string;         // Tipo de documento de la venta
    Serie: string;                   // Serie del documento
    NroDoc: string;                  // Número del documento
    Importe: number;                 // Importe total de la venta
    Dscto: number;                   // Descuento aplicado
    Total: number;                   // Total de la venta tras aplicar descuentos
    IdTaxista: string;               // Id del taxista, en este caso '00000'
    TipoDescuento: string;           // Tipo de descuento aplicado
    CodigoPromocional?: string;      // Códigos promocionales asociados (opcional)
    Activo: string;                  // Indica si el descuento está activo ('Si' o 'No')
    FechaReg: Date;                  // Fecha de registro de la venta
  }

  export interface VentasDTO {
    IdVenta: number;            // Id de la venta
    Tipo: string;               // Tipo de documento de la venta
    Serie: string;              // Serie del documento
    NumeroDocumento: string;    // Número del documento formateado
    Fecha: Date;                // Fecha de la venta
    Monto: number;              // Monto total de la venta
    Cliente: string;            // Nombre del cliente o beneficiario
    NumeroDoi: string;          // Número DOI (Documento de Identidad del cliente)
    NombreArchivo: string;      // Nombre del archivo generado
    FormaPago: string;          // Forma de pago utilizada
    IdTipoPedido: string;       // Tipo de pedido
  }
  
export interface InformeContableInterface {
    IdVenta: number;
    Fecha: string;
    Serie: string;
    TipoDocumento: string;
    Documento: string;
    Ruc: string;
    Cliente: string;
    Moneda: string;
    Dscto: number;
    OpInafecto: number;
    ValorVenta: number;
    IGV: number;
    Servicio: number;
    ICBPER: number;
    Total: number;
    EstadoDescripcion: string;
    EstadoSunat: string;
    DocRef: string;
    FechaRef: string;
    Empresa: string;
    RucEmpresa: string;
    DirecEmpresa: string;
}