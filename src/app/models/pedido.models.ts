import { NumberInput } from "@angular/cdk/coercion";
import { PedidoDet } from "./pedidodet.models";

export class PedidoCab {

    IdEmpleado: string;
    Cliente: String;
    Direccion: String;
    Referencia: string;
    IdPedido: number;
    NroCuenta: Number;
    NroPedido: Number;
    Total: number;
    IdTipoPedido: String;
    Estado: Number;
    Moneda: string;
    TipoCambioVenta: Number;
    TipoCambioCompra: Number;
    FechaCambiada: Date;
    IdSocioNegocio: number;
    Importe: number;
    UsuReg: number;
    UsuMod: number;
    IdMesa: string;
    IdTurno: number;
    IdCaja: String;
    NumPrecuentas: number;
    FechaPrecuenta?: Date;
    MesaPrecuenta: string;
    Observacion: string;
    Dscto: number;
    Mesa: string;
     NroPax: number;
     ListaPedidoDet: PedidoDet[];
    
    constructor(init?: Partial<PedidoCab>) {
        Object.assign(this, init);
    }
}