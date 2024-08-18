import { NumberInput } from "@angular/cdk/coercion";
import { PedidoDet } from "./pedidodet.models";

export class PedidoCab {

    public IdEmpleado: string;
    Cliente: String;
    Direccion: String;
    Referencia: string;
    public IdPedido: number;
    NroCuenta: Number;
    NroPedido: Number;
    public Total: number;
    IdTipoPedido: String;
    Estado: Number;
    Moneda: string;
    TipoCambioVenta: Number;
    TipoCambioCompra: Number;
    FechaCambiada: Date;
    public Importe: number;
    public UsuReg: number;
    public UsuMod: number;
    public IdMesa: string;
    IdTurno: number;
    IdCaja: String;
    NumPrecuentas: number;
    FechaPrecuenta?: Date;
    MesaPrecuenta: string;
    Observacion: string;
    Dscto: number;
    public Mesa: string;
    public NroPax: number;
    public ListaPedidoDet: PedidoDet[];
    
    constructor(init?: Partial<PedidoCab>) {
        Object.assign(this, init);
    }
}