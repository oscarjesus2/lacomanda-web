export class Tarjeta {

   public IdTarjeta: number;
   public Descripcion: string;
   
   constructor(init?: Partial<Tarjeta>) {
      Object.assign(this, init);
  }
}