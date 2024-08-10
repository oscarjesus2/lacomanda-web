export class Tarjeta {

   public IdTarjeta: string;
   public Descripcion: string;
   
   constructor(init?: Partial<Tarjeta>) {
      Object.assign(this, init);
  }
}