import { Producto } from "./product.models";

export class PedidoComplemento {
    Estado?: number;
    IdPedido: number;
    ItemComple: number;
    ItemRef: number;
    ProductoComplemento: Producto;
    Cantidad: number;
    NumEnvios: number;
    constructor(init?: Partial<PedidoComplemento>) {
        Object.assign(this, init);
    }
  }
