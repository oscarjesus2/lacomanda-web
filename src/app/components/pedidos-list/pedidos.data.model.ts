export class DialogDataPedidos {
    id: number;
    numeroPedido: number;
    cliente: string;

    constructor(id: number, numeroPedido: number, cliente: string) {
        this.id = id;
        this.numeroPedido = numeroPedido;
        this.cliente = cliente;
    }
}