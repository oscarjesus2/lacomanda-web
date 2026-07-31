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
    public SinPrecio: boolean;
    public Stock: number;
    public IdGrupoVenta: number;
    public IdMoneda: string;
    public EsProductoBolsa: boolean;
    public Tipo: number;
    public ExclusivoParaAnfitriona: boolean;
    public PermitirParaTragoCortesia: boolean;
    public PosicionComplemento: number;
    public Qty: number;
    public FactorComplemento: number;
    public PrecioMinimo: number;
    public IdClaseCombo: number;
    public IdImpuestoPais: string;
    public InsumoProducto: string;
    public TieneReceta: boolean;
    public IdUnidadStock: number | null;
    public IdUnidadReceta: number | null;
    public FactorReceta: number;
    public IdGrupoCompra: number | null;
    public IdAreaAlmacen: number | null;
    public DescripcionCompra: string;
    public PrecioCompra: number;
    public StockMinimo: number;
    public StockMaximo: number;
    public Inventario: boolean;
    public ControlDirectoStock: boolean;
    ProductoAreaImpresion?: ProductoAreaImpresion[];

    constructor(init?: Partial<Producto>) {
        Object.assign(this, init);
    }
}
