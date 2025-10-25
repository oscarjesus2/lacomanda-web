import { PedidoComplemento } from "./pedidocomplemento.models";
import { Producto } from "./product.models";

export class PedidoDet {

    public Producto: Producto;
    public PedidoComplemento: PedidoComplemento[];
    public IdPedido: number;
    public Item: number;
    public Precio: number;
    public Cantidad: number=0;
    public Subtotal: number;
    public Observacion: string;
    public Anfitriona: string;
    public Ip: string;
    public NroCuenta: number;
    public Enviado: boolean;
    public IdDescuento: string;
    public MontoDescuento: number;
    public UsuDescuento: number;
    public NroCupon: string;
    public NumEnvios: number;
    public MotivoReimpresion: string;
    public NumReimpresion: number;
    public UsuReimpresion: number;
    public FecReimpresion?: Date;
    public Estado: number;
    public NombreCuenta: string;
    public Division: number;
    public Impuesto1: number;
    constructor(init?: Partial<PedidoDet>) {
        Object.assign(this, init);
    }
}