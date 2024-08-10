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
    NroCuenta: number;
    Enviado: boolean;
    IdDescuento: string;
  MontoDescuento: number;
  NroCupon: string;
  NumEnvios: number;
  MotivoReimpresion: string;
  NumReimpresion: number;
  UsuReimpresion: number;
  FecReimpresion?: Date;
  Estado: number;
  nombreCuenta: string;
  Division: number;
  Impuesto1: number;
 
    constructor(init?: Partial<PedidoDet>) {
        Object.assign(this, init);
    }
}