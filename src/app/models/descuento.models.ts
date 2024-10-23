export class Descuento {

   public IdDescuento: string;
   public Descripcion: string;
   public Porcentaje: number;
   public TipoDescuento: string;
   public Estado: number;
   
   constructor(init?: Partial<Descuento>) {
      Object.assign(this, init);
  }
}