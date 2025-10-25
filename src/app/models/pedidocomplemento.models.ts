import { Producto } from "./product.models";

export class PedidoComplemento {
    IdPedido: number;
    ItemComple: number;
    ItemRef: number;
    ProductoComplemento: Producto;
    Cantidad: number;
    constructor(init?: Partial<PedidoComplemento>) {
        Object.assign(this, init);
    }
  }
  