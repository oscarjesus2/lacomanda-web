import { EntradaDet } from "./entradadet.models";

export class EntradaCab {
    IdEntrada: number;
    NumDocumento: string;
    IdTipoDocumento: string;
    FechaEmision: Date;
    FechaRecepcion: Date;
    IdProveedor: string;
    IdTipoMovi: number;
    IdSubTipoMovi?: number; // Campo opcional
    IdMoneda: string;
    ValorCompra: number;
    Isc: number;
    Igv: number;
    TotalCompra: number;
    Observacion?: string; // Campo opcional
    IdTienda: string;
    MontoPagado?: number; // Campo opcional
    IdTipoCambio?: number; // Campo opcional
    TasaCambio: number;
    FechaPago?: Date; // Campo opcional
    Calculo?: number; // Campo opcional
    IdCaja?: string; // Campo opcional
    IdEmpleado?: string; // Campo opcional
    IdTurno?: number; // Campo opcional
    Estado: number;
    EstadoPago?: number; // Campo opcional
    UsuReg?: number; // Campo opcional
    FecReg?: Date; // Campo opcional
    UsuMod?: number; // Campo opcional
    FecMod?: Date; // Campo opcional
    UsuAnula?: number; // Campo opcional
    FecAnula?: Date; // Campo opcional
    Opcion?: number; // Campo opcional
    Referencia?: string; // Campo opcional
    TipoCambio?: number; // Campo opcional
    NumGastoDia?: number; // Campo opcional
    TipoGastoDia?: string; // Campo opcional
    NumSI?: number; // Campo opcional
    ListaEntradaDet: EntradaDet[];
}
