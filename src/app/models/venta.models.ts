
import { Cliente } from "./cliente.models";

export class Venta {

    IdVenta: number;
    IdTipoDocumento: number;
    Beneficiario: string;
    NumDocumento: number;
    Serie: string;
    IdCliente: number;
    IdPedido: number;
    NroCuenta: number;
    IdCaja: number;
    Impuesto1: number;
    IdEmpleado: number;
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