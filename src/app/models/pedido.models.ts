import { PedidoDet } from "./pedidodet.models";

export class PedidoCab {

    public IdEmpleado: string;
    public IdPedido: number;
    public Total: number;
    public Importe: number;
    public UsuReg: number;
    public UsuMod: number;
    public IdMesa: string;
    public Mesa: string;
    public NroPax: string;
    public ListaPedidoDet: PedidoDet[];
    
    constructor(IdEmpleado: string, IdPedido: number, Total: number, Importe: number, UsuReg: number,
        UsuMod: number, IdMesa: string, Mesa: string, NroPax: string, ListaPedidoDet: PedidoDet[]) {

        this.IdEmpleado = IdEmpleado;
        this.IdPedido = IdPedido;
        this.Total = Total;
        this.Importe = Importe;
        this.UsuReg = UsuReg;
        this.UsuMod = UsuMod;
        this.IdMesa = IdMesa;
        this.Mesa = Mesa;
        this.NroPax = NroPax;
        this.ListaPedidoDet = ListaPedidoDet;

    }

}