 
export class ventadiariasemanalmensual {

    public Agrupado: string;
    public Producto: string;
    public Total: number;
    public Cantidad: number;
    public Transacciones: number;
    constructor(Agrupado: string, Producto: string, Total: number, Cantidad: number, Transacciones: number) {
        this.Agrupado = Agrupado;
        this.Producto = Producto;
        this.Total = Total;
        this.Cantidad= Cantidad;
        this.Transacciones=Transacciones;
    }

}