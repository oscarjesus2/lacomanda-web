import { Tarjeta } from "./tarjeta.models";

export class Pago {

    Estado: number;
    UsuReg: number;
    IdTurno: number;
    Autorizacion: string;
    Tarjeta: Tarjeta;
    Vuelto: number;
    IdTarjeta: number;
    Propina: number;
    MontoVenta: number;
    MontoPagado: number;
    IdTipoPago: number;
    IdMoneda: string;
    IdVenta: number;
    
    constructor(init?: Partial<Pago>) {
        Object.assign(this, init);
    }
}
