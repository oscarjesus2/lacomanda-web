export class TipoPedido {

   public IdTipoPedido: string;
   public Descripcion: string;
   
   constructor(init?: Partial<TipoPedido>) {
      Object.assign(this, init);
  }
}