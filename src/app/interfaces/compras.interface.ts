
export interface InformeContableCompra {
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