export class PedidoDet {

    public IdPedido: number;
    public Item: number;
    public IdProducto: number;
    public NombreCorto: string;
    public Precio: number;
    public Cantidad: number=0;
    public Subtotal: number;
    public Observacion: string;
    public IdSubFamilia:string;
    public Ip: string;
 

    constructor(Item: number, 
                IdPedido: number, 
                IdProducto: number, 
                NombreCorto: string, 
                Precio: number, 
                Cantidad: number, 
                Subtotal: number, 
                Observacion: string, 
                Ip:string) {

        this.Item = Item;
        this.IdPedido = IdPedido;
        this.IdProducto = IdProducto;
        this.NombreCorto= NombreCorto;
        this.Precio = Precio;
        this.Cantidad = Cantidad;
        this.Subtotal = Subtotal;
        this.Observacion=Observacion;
        this.Ip=Ip;
 
    }
}