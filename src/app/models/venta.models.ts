
import { Cliente } from "./cliente.models";

export class Venta {

    IdVenta: number;
    IdTipoDocumento: string;
    Beneficiario: string;
    NumDocumento: number;
    Serie: string;
    IdCliente: string;
    IdPedido: number;
    NroCuenta: number;
    IdCaja: string;
    Impuesto1: number;
    IdEmpleado: string;
    Total: number;
    Importe: number;
    Dscto: number;
    UsuRegistra: number;
    IdTurno: number; 
    Propina: number;
    ByteTicket: Uint8Array;
    Estado: number;
    constructor(init?: Partial<Venta>) {
        Object.assign(this, init);
    }

}