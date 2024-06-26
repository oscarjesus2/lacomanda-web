export class ProductGrid {

    public item: number;
    public idPedido: number;
    public idProducto: number;
    public name: string;
    public price: number;
    public cantidad: number;
    public total: number;
    public observacion: string;
    constructor(item: number, idPedido: number, idProducto: number, name: string, price: number, cantidad: number, total: number, observacion: string) {
        this.item = item;
        this.idPedido = idPedido
        this.idProducto = idProducto;
        this.name = name;
        this.price = price;
        this.cantidad = cantidad;
        this.total = total;
        this.observacion   = observacion;
    }

}
