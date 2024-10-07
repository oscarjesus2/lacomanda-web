export class Product {

    public Activo: number;
    public Descripcion: string;
    public IdProducto: number;
    public NombreCorto: string;
    public IdSubFamilia: string;
    public Posicion: number;
    public Precio: number;
    public R: number;
    public G: number;
    public B: number;
    public Observacion: string;
    public color: string;
    public cols: number;
    public rows: number;
    public Visible: number;
    public EsServicio: boolean;
    public SinPrecio: number;
    public Stock: number;
    public MonedaVenta: string;
    public ImpuestoBolsa: number;
    public EsProductoBolsa: boolean;
    public Tipo: number;
    public ExclusivoParaAnfitriona: boolean;
    public PermitirParaTragoCortesia: boolean;
    public PosicionComplemento: number;
    public Qty: number;
    public FactorComplemento: number;
    constructor(init?: Partial<Product>) {
        Object.assign(this, init);
    }
}
