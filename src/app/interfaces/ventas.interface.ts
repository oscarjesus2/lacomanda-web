export interface ventasInterface {
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
