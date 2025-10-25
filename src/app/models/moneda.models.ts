export class Moneda {

   public IdMoneda: string;
   public Descripcion: string;
   
   constructor(init?: Partial<Moneda>) {
      Object.assign(this, init);
  }
}