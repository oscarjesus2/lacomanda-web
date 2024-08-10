import { Tarjeta } from "./tarjeta.models";

export class Pago {

    Estado: number;
    UsuReg: number;
    IdTurno: number;
    Autorizacion: string;
    Tarjeta: Tarjeta;
    Vuelto: number;
    Propina: number;
    MontoVenta: number;
    MontoPagado: number;
    IdTipoPago: string;
    IdVenta: number;
    
    constructor(init?: Partial<Pago>) {
        Object.assign(this, init);
    }
}
