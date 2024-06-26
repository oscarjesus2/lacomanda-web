export class PedidoDelete {

    public UsuAnula: number;
    public MotivoAnula: string;
    public IdPedido: number;
    public IdProducto: number;
    public Item: number;

    constructor(UsuAnula: number, MotivoAnula: string, IdPedido: number, IdProducto: number, Item: number) {
        this.UsuAnula = UsuAnula;
        this.MotivoAnula = MotivoAnula;
        this.IdPedido = IdPedido;
        this.IdProducto = IdProducto;
        this.Item = Item;
    }

}