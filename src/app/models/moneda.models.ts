export class Moneda {

   public IdMoneda: string;
   public Descripcion: string;
   public Simbolo: string;
   public CodigoISO: string;

   constructor(init?: Partial<Moneda>) {
      Object.assign(this, init);
  }
}