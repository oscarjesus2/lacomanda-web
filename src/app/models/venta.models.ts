
import { Cliente } from "./cliente.models";

export class Venta {

    public IdTipoDocumento: string;
    public IdPedido: number;
    public UsuRegistra: number;
    public oCliente:  Cliente;
    constructor(IdTipoDocumento: string, IdPedido: number, UsuRegistra: number, Cliente:  Cliente) {
        this.IdTipoDocumento = IdTipoDocumento;
        this.IdPedido = IdPedido;
        this.UsuRegistra = UsuRegistra;
        this.oCliente=Cliente;
    }

}