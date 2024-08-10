
import { Cliente } from "./cliente.models";

export class Venta {

    IdVenta: number;
    IdTipoDocumento: string;
    NumDocumento: number;
    Serie: string;
    IdPedido: number;
    NroCuenta: number;
    IdCaja: string;
    Impuesto1: number;
    Total: number;
    Importe: number;
    Dscto: number;
    UsuRegistra: number;
    IdTurno: number; 
    oCliente:  Cliente;
    Propina: number;
    ByteTicket: Uint8Array;
    constructor(init?: Partial<Venta>) {
        Object.assign(this, init);
    }

}