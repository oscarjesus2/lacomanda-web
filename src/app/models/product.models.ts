import { ProductoAreaImpresion } from "./producto-area-impresion.models";

export class Producto {

    public Activo: boolean;
    public Descripcion: string;
    public IdProducto: number;
    public NombreCorto: string;
    public IdFamilia: number;
    public IdSubFamilia: number;
    public Posicion: number;
    public Precio: number;
    public R: number;
    public G: number;
    public B: number;
    public Observacion: string;
    public color: string;
    public cols: number;
    public rows: number;
    public Visible: boolean;
    public EsServicio: boolean;
    public SinPrecio: number;
    public Stock: number;
    public IdGrupoVenta: number;
    public MonedaVenta: string;
    public ImpuestoBolsa: number;
    public EsProductoBolsa: boolean;
    public Tipo: number;
    public ExclusivoParaAnfitriona: boolean;
    public PermitirParaTragoCortesia: boolean;
    public PosicionComplemento: number;
    public Qty: number;
    public FactorComplemento: number;
    public PrecioMinimo: number;
    public IdClaseCombo: number;
    public IdImpuestoPais: number;
    public InsumoProducto: string;
      ProductoAreaImpresion?: ProductoAreaImpresion[];

    constructor(init?: Partial<Producto>) {
        Object.assign(this, init);
    }
}
