import { PedidoDet } from "./pedidodet.models";

export class PedidoCab {

    IdEmpleado: number;
    Cliente: String;
    Direccion: String;
    Referencia: string;
    IdPedido: number;
    NroCuenta: number;
    NroPedido: number;
    Total: number;
    IdCanalVenta: number;
    Estado: number;
    Moneda: string;
    TipoCambioVenta: number;
    TipoCambioCompra: number;
    FechaCambiada: Date;
    IdSocioNegocio: number;
    Importe: number;
    UsuReg: number;
    UsuMod: number;
    IdEspacio: number;
    IdTurno: number;
    IdCaja: number;
    NumPrecuentas: number;
    FechaPrecuenta?: Date;
    EspacioPrecuenta: string;
    Observacion: string;
    Dscto: number;
    Espacio: string;
     NroPax: number;
     ListaPedidoDet: PedidoDet[];
    
    constructor(init?: Partial<PedidoCab>) {
        Object.assign(this, init);
    }
}