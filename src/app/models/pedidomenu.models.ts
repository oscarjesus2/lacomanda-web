import { Producto } from './product.models';

export class PedidoMenu {
  public IdPedido: number;
  public ItemRef: number;
  public ItemMenu: number;
  public IdProductoSeccionMenu: number;
  public IdSeccionMenu: number;
  public SeccionMenu: string;
  public ProductoSeccionMenu: Producto;
  public Cantidad: number;
  public Observacion: string;
  public Enviado: boolean;

  constructor(init?: Partial<PedidoMenu>) {
    Object.assign(this, init);
  }
}
