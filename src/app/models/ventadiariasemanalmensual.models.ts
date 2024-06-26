 
export class ventadiariasemanalmensual {

    public Agrupado: string;
    public Producto: string;
    public Total: number;
    public Cantidad: number;
    
    constructor(Agrupado: string, Producto: string, Total: number, Cantidad: number) {
        this.Agrupado = Agrupado;
        this.Producto = Producto;
        this.Total = Total;
        this.Cantidad= Cantidad;
    }

}